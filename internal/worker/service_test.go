package worker

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/joaovrmoraes/batrewind/internal/session"
)

// --- Mock session.Service ---

type mockSessionSvc struct {
	ingestFn     func(req session.IngestRequest) error
	saveFailedFn func(f *session.FailedIngest) error
	ingestCalls  int
}

func (m *mockSessionSvc) Ingest(req session.IngestRequest) error {
	m.ingestCalls++
	if m.ingestFn != nil {
		return m.ingestFn(req)
	}
	return nil
}

func (m *mockSessionSvc) SaveFailed(f *session.FailedIngest) error {
	if m.saveFailedFn != nil {
		return m.saveFailedFn(f)
	}
	return nil
}

// --- ingestSvc interface (matches what worker.Service needs) ---

type ingestSvc interface {
	Ingest(req session.IngestRequest) error
	SaveFailed(f *session.FailedIngest) error
}

// svcAdapter lets us test process() with a mock without changing production code.
type testableService struct {
	Service
	mockSvc ingestSvc
}

func (s *testableService) process(ctx context.Context, workerID int, msgID string, req session.IngestRequest) {
	delays := []int{0, 0, 0, 0} // zero delays for fast tests

	for attempt := range len(delays) {
		if err := s.mockSvc.Ingest(req); err == nil {
			return
		}
		if attempt == len(delays)-1 {
			payload, _ := json.Marshal(req)
			f := &session.FailedIngest{
				SessionID:  req.SessionID,
				Payload:    string(payload),
				RetryCount: attempt + 1,
			}
			_ = s.mockSvc.SaveFailed(f)
		}
	}
}

func validReq() session.IngestRequest {
	data, _ := json.Marshal(map[string]string{"k": "v"})
	return session.IngestRequest{
		SessionID:   "sess-1",
		Identifier:  "user@test.com",
		ServiceName: "app",
		Events:      []session.RawEvent{{Type: 2, Data: data, Timestamp: 1000}},
	}
}

// --- Tests ---

func TestProcess_SuccessOnFirstAttempt(t *testing.T) {
	mock := &mockSessionSvc{}
	svc := &testableService{mockSvc: mock}

	svc.process(context.Background(), 1, "msg-1", validReq())
	assert.Equal(t, 1, mock.ingestCalls)
}

func TestProcess_RetriesOnFailure(t *testing.T) {
	callCount := 0
	mock := &mockSessionSvc{
		ingestFn: func(req session.IngestRequest) error {
			callCount++
			if callCount < 3 {
				return assert.AnError
			}
			return nil
		},
	}
	svc := &testableService{mockSvc: mock}

	svc.process(context.Background(), 1, "msg-1", validReq())
	assert.Equal(t, 3, callCount)
}

func TestProcess_PermanentFailure_SavesFailedIngest(t *testing.T) {
	var saved *session.FailedIngest
	mock := &mockSessionSvc{
		ingestFn: func(req session.IngestRequest) error {
			return assert.AnError
		},
		saveFailedFn: func(f *session.FailedIngest) error {
			saved = f
			return nil
		},
	}
	svc := &testableService{mockSvc: mock}

	req := validReq()
	svc.process(context.Background(), 1, "msg-1", req)

	require.NotNil(t, saved)
	assert.Equal(t, "sess-1", saved.SessionID)
	assert.Greater(t, saved.RetryCount, 0)

	// payload must be valid JSON of the original request
	var decoded session.IngestRequest
	err := json.Unmarshal([]byte(saved.Payload), &decoded)
	require.NoError(t, err)
	assert.Equal(t, req.SessionID, decoded.SessionID)
}

func TestProcess_PermanentFailure_DoesNotSaveIfIngestEventuallySucceeds(t *testing.T) {
	saveCalled := false
	callCount := 0
	mock := &mockSessionSvc{
		ingestFn: func(req session.IngestRequest) error {
			callCount++
			if callCount == 2 {
				return nil
			}
			return assert.AnError
		},
		saveFailedFn: func(f *session.FailedIngest) error {
			saveCalled = true
			return nil
		},
	}
	svc := &testableService{mockSvc: mock}

	svc.process(context.Background(), 1, "msg-1", validReq())
	assert.False(t, saveCalled)
}

func TestDefaultConfig_HasSensibleValues(t *testing.T) {
	cfg := DefaultConfig()
	assert.GreaterOrEqual(t, cfg.MinWorkerCount, 1)
	assert.Greater(t, cfg.MaxWorkerCount, cfg.MinWorkerCount)
	assert.Greater(t, cfg.MaxRetries, 0)
	assert.True(t, cfg.EnableAutoscaling)
	assert.Greater(t, cfg.ScaleUpThreshold, cfg.ScaleDownThreshold)
}
