package session

import (
	"encoding/json"
	"time"
)

// ReplaySession represents a recorded browser session.
type ReplaySession struct {
	ID           string     `json:"id"            gorm:"primaryKey"`
	BatSessionID string     `json:"bat_session_id" gorm:"column:bat_session_id"` // link to BatAudit session_id
	Identifier   string     `json:"identifier"`
	UserEmail    string     `json:"user_email"`
	UserName     string     `json:"user_name"`
	StartURL     string     `json:"start_url"`
	Environment  string     `json:"environment"`
	ServiceName  string     `json:"service_name"`
	StartedAt    time.Time  `json:"started_at"`
	EndedAt      *time.Time `json:"ended_at"`
	DurationMs   *int64     `json:"duration_ms"`
	EventCount   int        `json:"event_count"`
	CreatedAt    time.Time  `json:"created_at"`
}

func (ReplaySession) TableName() string { return "replay_sessions" }

// ReplayEvent is a single rrweb event stored for a session.
type ReplayEvent struct {
	ID        string          `json:"id"         gorm:"primaryKey"`
	SessionID string          `json:"session_id" gorm:"column:session_id"`
	Seq       int             `json:"seq"`
	Type      int             `json:"type"`
	Data      json.RawMessage `json:"data"       gorm:"type:text"`
	Timestamp int64           `json:"timestamp"` // Unix ms from rrweb
	CreatedAt time.Time       `json:"created_at"`
}

func (ReplayEvent) TableName() string { return "replay_events" }

// IngestRequest is the payload sent by the browser SDK.
type IngestRequest struct {
	// Session metadata — sent on first batch or when starting a new session.
	SessionID    string `json:"session_id"    binding:"required"`
	BatSessionID string `json:"bat_session_id"`
	Identifier   string `json:"identifier"    binding:"required"`
	UserEmail    string `json:"user_email"`
	UserName     string `json:"user_name"`
	StartURL     string `json:"start_url"`
	Environment  string `json:"environment"`
	ServiceName  string `json:"service_name"  binding:"required"`

	// rrweb events batch.
	Events []RawEvent `json:"events" binding:"required,min=1"`
}

// RawEvent mirrors the minimal rrweb event structure.
type RawEvent struct {
	Type      int             `json:"type"      binding:"required"`
	Data      json.RawMessage `json:"data"      binding:"required"`
	Timestamp int64           `json:"timestamp" binding:"required"`
}

// ListFilter holds query params for listing sessions.
type ListFilter struct {
	Identifier  string
	ServiceName string
	Environment string
	StartDate   *time.Time
	EndDate     *time.Time
	Limit       int
	Offset      int
}

// FailedIngest stores batches that could not be processed after all retries.
// Exposed via the Reader API so users can retry from the dashboard.
type FailedIngest struct {
	ID         string     `json:"id"          gorm:"primaryKey"`
	SessionID  string     `json:"session_id"`
	Payload    string     `json:"payload"     gorm:"type:text"` // raw JSON of IngestRequest
	Error      string     `json:"error"`
	RetryCount int        `json:"retry_count"`
	Resolved   bool       `json:"resolved"`
	CreatedAt  time.Time  `json:"created_at"`
	ResolvedAt *time.Time `json:"resolved_at"`
}

func (FailedIngest) TableName() string { return "failed_ingest" }

// Stats is returned by GET /v1/stats.
type Stats struct {
	TotalSessions     int64           `json:"total_sessions"`
	SessionsToday     int64           `json:"sessions_today"`
	SessionsThisWeek  int64           `json:"sessions_this_week"`
	FailedIngestCount int64           `json:"failed_ingest_count"`
	ActiveServices    []string        `json:"active_services"`
	RecentSessions    []ReplaySession `json:"recent_sessions"`
}
