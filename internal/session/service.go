package session

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type repository interface {
	UpsertSession(s *ReplaySession) error
	IncrementEventCount(sessionID string, delta int) error
	UpdateSessionEnd(s *ReplaySession) error
	InsertEvents(events []ReplayEvent) error
	List(f ListFilter) ([]ReplaySession, int64, error)
	GetByID(id string) (*ReplaySession, error)
	GetEvents(sessionID string) ([]ReplayEvent, error)
	GetStats() (*Stats, error)
	SaveFailed(f *FailedIngest) error
	ListFailed(onlyUnresolved bool) ([]FailedIngest, error)
	GetFailed(id string) (*FailedIngest, error)
	MarkFailedResolved(id string) error
}

type Service struct {
	repo repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// Ingest receives a batch of rrweb events and persists them.
// It upserts the session and appends the events in order.
func (s *Service) Ingest(req IngestRequest) error {
	now := time.Now().UTC()

	session := &ReplaySession{
		ID:           req.SessionID,
		BatSessionID: req.BatSessionID,
		Identifier:   req.Identifier,
		UserEmail:    req.UserEmail,
		UserName:     req.UserName,
		StartURL:     req.StartURL,
		Environment:  defaultStr(req.Environment, "production"),
		ServiceName:  req.ServiceName,
		StartedAt:    now,
		CreatedAt:    now,
	}

	if err := s.repo.UpsertSession(session); err != nil {
		return fmt.Errorf("upsert session: %w", err)
	}

	events := make([]ReplayEvent, len(req.Events))
	for i, e := range req.Events {
		events[i] = ReplayEvent{
			ID:        uuid.New().String(),
			SessionID: req.SessionID,
			Seq:       i,
			Type:      e.Type,
			Data:      e.Data,
			Timestamp: e.Timestamp,
			CreatedAt: now,
		}
	}

	if err := s.repo.InsertEvents(events); err != nil {
		return fmt.Errorf("insert events: %w", err)
	}

	return s.repo.IncrementEventCount(req.SessionID, len(events))
}

// FinalizeSession marks a session as ended and computes duration.
func (s *Service) FinalizeSession(sessionID string) error {
	sess, err := s.repo.GetByID(sessionID)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	durationMs := now.Sub(sess.StartedAt).Milliseconds()
	sess.EndedAt = &now
	sess.DurationMs = &durationMs
	return s.repo.UpdateSessionEnd(sess)
}

func (s *Service) List(f ListFilter) ([]ReplaySession, int64, error) {
	return s.repo.List(f)
}

func (s *Service) GetByID(id string) (*ReplaySession, error) {
	return s.repo.GetByID(id)
}

func (s *Service) GetEvents(sessionID string) ([]ReplayEvent, error) {
	return s.repo.GetEvents(sessionID)
}

func (s *Service) GetStats() (*Stats, error) {
	return s.repo.GetStats()
}

func (s *Service) SaveFailed(f *FailedIngest) error {
	return s.repo.SaveFailed(f)
}

func (s *Service) ListFailed(onlyUnresolved bool) ([]FailedIngest, error) {
	return s.repo.ListFailed(onlyUnresolved)
}

func (s *Service) RetryFailed(id string) error {
	f, err := s.repo.GetFailed(id)
	if err != nil {
		return fmt.Errorf("failed ingest not found: %w", err)
	}

	var req IngestRequest
	if err := json.Unmarshal([]byte(f.Payload), &req); err != nil {
		return fmt.Errorf("invalid payload: %w", err)
	}

	if err := s.Ingest(req); err != nil {
		return fmt.Errorf("retry failed: %w", err)
	}

	return s.repo.MarkFailedResolved(id)
}

func (s *Service) RetryAllFailed() (int, error) {
	items, err := s.repo.ListFailed(true)
	if err != nil {
		return 0, err
	}

	succeeded := 0
	for _, f := range items {
		if err := s.RetryFailed(f.ID); err == nil {
			succeeded++
		}
	}
	return succeeded, nil
}

func defaultStr(s, fallback string) string {
	if s == "" {
		return fallback
	}
	return s
}
