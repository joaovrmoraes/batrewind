package session

import (
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Mock Repository ---

type mockRepo struct {
	upsertFn            func(s *ReplaySession) error
	incrementFn         func(sessionID string, delta int) error
	updateEndFn         func(s *ReplaySession) error
	insertEventsFn      func(events []ReplayEvent) error
	listFn              func(f ListFilter) ([]ReplaySession, int64, error)
	getByIDFn           func(id string) (*ReplaySession, error)
	getEventsFn         func(sessionID string) ([]ReplayEvent, error)
	saveFailedFn        func(f *FailedIngest) error
	listFailedFn        func(onlyUnresolved bool) ([]FailedIngest, error)
	getFailedFn         func(id string) (*FailedIngest, error)
	markResolvedFn      func(id string) error
}

func (m *mockRepo) UpsertSession(s *ReplaySession) error {
	if m.upsertFn != nil {
		return m.upsertFn(s)
	}
	return nil
}

func (m *mockRepo) IncrementEventCount(sessionID string, delta int) error {
	if m.incrementFn != nil {
		return m.incrementFn(sessionID, delta)
	}
	return nil
}

func (m *mockRepo) UpdateSessionEnd(s *ReplaySession) error {
	if m.updateEndFn != nil {
		return m.updateEndFn(s)
	}
	return nil
}

func (m *mockRepo) InsertEvents(events []ReplayEvent) error {
	if m.insertEventsFn != nil {
		return m.insertEventsFn(events)
	}
	return nil
}

func (m *mockRepo) List(f ListFilter) ([]ReplaySession, int64, error) {
	if m.listFn != nil {
		return m.listFn(f)
	}
	return nil, 0, nil
}

func (m *mockRepo) GetByID(id string) (*ReplaySession, error) {
	if m.getByIDFn != nil {
		return m.getByIDFn(id)
	}
	return nil, errors.New("not found")
}

func (m *mockRepo) GetEvents(sessionID string) ([]ReplayEvent, error) {
	if m.getEventsFn != nil {
		return m.getEventsFn(sessionID)
	}
	return nil, nil
}

func (m *mockRepo) SaveFailed(f *FailedIngest) error {
	if m.saveFailedFn != nil {
		return m.saveFailedFn(f)
	}
	return nil
}

func (m *mockRepo) ListFailed(onlyUnresolved bool) ([]FailedIngest, error) {
	if m.listFailedFn != nil {
		return m.listFailedFn(onlyUnresolved)
	}
	return nil, nil
}

func (m *mockRepo) GetFailed(id string) (*FailedIngest, error) {
	if m.getFailedFn != nil {
		return m.getFailedFn(id)
	}
	return nil, errors.New("not found")
}

func (m *mockRepo) MarkFailedResolved(id string) error {
	if m.markResolvedFn != nil {
		return m.markResolvedFn(id)
	}
	return nil
}

// --- Helpers ---

func newSvc(repo *mockRepo) *Service {
	return &Service{repo: repo}
}

func validIngest() IngestRequest {
	data, _ := json.Marshal(map[string]string{"key": "value"})
	return IngestRequest{
		SessionID:   "session-abc",
		Identifier:  "user@example.com",
		ServiceName: "my-app",
		Environment: "production",
		Events: []RawEvent{
			{Type: 2, Data: data, Timestamp: time.Now().UnixMilli()},
			{Type: 3, Data: data, Timestamp: time.Now().UnixMilli() + 100},
		},
	}
}

// --- Ingest ---

func TestIngest_Success(t *testing.T) {
	var upsertCalled bool
	var insertedEvents []ReplayEvent
	var incrementedDelta int

	repo := &mockRepo{
		upsertFn: func(s *ReplaySession) error {
			upsertCalled = true
			assert.Equal(t, "session-abc", s.ID)
			assert.Equal(t, "user@example.com", s.Identifier)
			assert.Equal(t, "production", s.Environment)
			return nil
		},
		insertEventsFn: func(events []ReplayEvent) error {
			insertedEvents = events
			return nil
		},
		incrementFn: func(sessionID string, delta int) error {
			incrementedDelta = delta
			return nil
		},
	}

	svc := newSvc(repo)
	err := svc.Ingest(validIngest())

	require.NoError(t, err)
	assert.True(t, upsertCalled)
	assert.Len(t, insertedEvents, 2)
	assert.Equal(t, 2, incrementedDelta)
}

func TestIngest_DefaultsEnvironmentToProduction(t *testing.T) {
	var capturedEnv string
	repo := &mockRepo{
		upsertFn: func(s *ReplaySession) error {
			capturedEnv = s.Environment
			return nil
		},
	}

	req := validIngest()
	req.Environment = ""
	err := newSvc(repo).Ingest(req)

	require.NoError(t, err)
	assert.Equal(t, "production", capturedEnv)
}

func TestIngest_EventsHaveCorrectSessionID(t *testing.T) {
	var captured []ReplayEvent
	repo := &mockRepo{
		insertEventsFn: func(events []ReplayEvent) error {
			captured = events
			return nil
		},
	}

	err := newSvc(repo).Ingest(validIngest())
	require.NoError(t, err)
	for _, e := range captured {
		assert.Equal(t, "session-abc", e.SessionID)
	}
}

func TestIngest_UpsertError_ReturnsError(t *testing.T) {
	repo := &mockRepo{
		upsertFn: func(s *ReplaySession) error {
			return errors.New("db error")
		},
	}
	err := newSvc(repo).Ingest(validIngest())
	assert.Error(t, err)
}

func TestIngest_InsertEventsError_ReturnsError(t *testing.T) {
	repo := &mockRepo{
		insertEventsFn: func(events []ReplayEvent) error {
			return errors.New("insert failed")
		},
	}
	err := newSvc(repo).Ingest(validIngest())
	assert.Error(t, err)
}

// --- FinalizeSession ---

func TestFinalizeSession_ComputesDuration(t *testing.T) {
	startedAt := time.Now().Add(-2 * time.Minute)
	var updatedSession *ReplaySession

	repo := &mockRepo{
		getByIDFn: func(id string) (*ReplaySession, error) {
			return &ReplaySession{ID: id, StartedAt: startedAt}, nil
		},
		updateEndFn: func(s *ReplaySession) error {
			updatedSession = s
			return nil
		},
	}

	err := newSvc(repo).FinalizeSession("session-abc")
	require.NoError(t, err)
	require.NotNil(t, updatedSession.EndedAt)
	require.NotNil(t, updatedSession.DurationMs)
	assert.Greater(t, *updatedSession.DurationMs, int64(0))
}

func TestFinalizeSession_SessionNotFound_ReturnsError(t *testing.T) {
	repo := &mockRepo{
		getByIDFn: func(id string) (*ReplaySession, error) {
			return nil, errors.New("not found")
		},
	}
	err := newSvc(repo).FinalizeSession("missing")
	assert.Error(t, err)
}

// --- List ---

func TestList_ForwardsFilters(t *testing.T) {
	var captured ListFilter
	repo := &mockRepo{
		listFn: func(f ListFilter) ([]ReplaySession, int64, error) {
			captured = f
			return nil, 0, nil
		},
	}

	f := ListFilter{Identifier: "user@example.com", ServiceName: "api", Environment: "staging"}
	_, _, err := newSvc(repo).List(f)

	require.NoError(t, err)
	assert.Equal(t, "user@example.com", captured.Identifier)
	assert.Equal(t, "api", captured.ServiceName)
	assert.Equal(t, "staging", captured.Environment)
}

func TestList_ReturnsTotal(t *testing.T) {
	repo := &mockRepo{
		listFn: func(f ListFilter) ([]ReplaySession, int64, error) {
			return []ReplaySession{{ID: "s1"}, {ID: "s2"}}, 42, nil
		},
	}

	sessions, total, err := newSvc(repo).List(ListFilter{})
	require.NoError(t, err)
	assert.Len(t, sessions, 2)
	assert.Equal(t, int64(42), total)
}

// --- RetryFailed ---

func TestRetryFailed_Success(t *testing.T) {
	req := validIngest()
	payload, _ := json.Marshal(req)
	var resolvedID string
	var upsertCalled bool

	repo := &mockRepo{
		getFailedFn: func(id string) (*FailedIngest, error) {
			return &FailedIngest{ID: id, SessionID: req.SessionID, Payload: string(payload)}, nil
		},
		upsertFn: func(s *ReplaySession) error {
			upsertCalled = true
			return nil
		},
		markResolvedFn: func(id string) error {
			resolvedID = id
			return nil
		},
	}

	err := newSvc(repo).RetryFailed("failed-1")
	require.NoError(t, err)
	assert.True(t, upsertCalled)
	assert.Equal(t, "failed-1", resolvedID)
}

func TestRetryFailed_NotFound_ReturnsError(t *testing.T) {
	repo := &mockRepo{
		getFailedFn: func(id string) (*FailedIngest, error) {
			return nil, errors.New("not found")
		},
	}
	err := newSvc(repo).RetryFailed("missing")
	assert.Error(t, err)
}

func TestRetryFailed_InvalidPayload_ReturnsError(t *testing.T) {
	repo := &mockRepo{
		getFailedFn: func(id string) (*FailedIngest, error) {
			return &FailedIngest{ID: id, Payload: "not-valid-json"}, nil
		},
	}
	err := newSvc(repo).RetryFailed("bad")
	assert.Error(t, err)
}

// --- RetryAllFailed ---

func TestRetryAllFailed_ReturnsSuccessCount(t *testing.T) {
	req := validIngest()
	payload, _ := json.Marshal(req)

	repo := &mockRepo{
		listFailedFn: func(onlyUnresolved bool) ([]FailedIngest, error) {
			return []FailedIngest{
				{ID: "f1", Payload: string(payload)},
				{ID: "f2", Payload: string(payload)},
			}, nil
		},
		getFailedFn: func(id string) (*FailedIngest, error) {
			return &FailedIngest{ID: id, Payload: string(payload)}, nil
		},
	}

	count, err := newSvc(repo).RetryAllFailed()
	require.NoError(t, err)
	assert.Equal(t, 2, count)
}

func TestRetryAllFailed_PartialFailure_CountsOnlySucceeded(t *testing.T) {
	req := validIngest()
	payload, _ := json.Marshal(req)

	callCount := 0
	repo := &mockRepo{
		listFailedFn: func(onlyUnresolved bool) ([]FailedIngest, error) {
			return []FailedIngest{
				{ID: "f1", Payload: string(payload)},
				{ID: "f2", Payload: "invalid-json"},
			}, nil
		},
		getFailedFn: func(id string) (*FailedIngest, error) {
			callCount++
			if id == "f2" {
				return &FailedIngest{ID: id, Payload: "invalid-json"}, nil
			}
			return &FailedIngest{ID: id, Payload: string(payload)}, nil
		},
	}

	count, err := newSvc(repo).RetryAllFailed()
	require.NoError(t, err)
	assert.Equal(t, 1, count)
}
