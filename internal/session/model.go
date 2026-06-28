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
	Trigger      string     `json:"trigger"` // why the session was uploaded: manual | error | stream
	ShareToken   *string    `json:"share_token,omitempty" gorm:"column:share_token"` // public read-only link token

	// Client/device metadata, captured by the SDK on the first batch.
	ScreenWidth      int     `json:"screen_width"`
	ScreenHeight     int     `json:"screen_height"`
	ViewportWidth    int     `json:"viewport_width"`
	ViewportHeight   int     `json:"viewport_height"`
	DevicePixelRatio float64 `json:"device_pixel_ratio"`
	Language         string  `json:"language"`
	Timezone         string  `json:"timezone"`
	UserAgent        string  `json:"user_agent"`
	// Derived server-side from UserAgent — never trusted from the client.
	Browser        string `json:"browser"`
	BrowserVersion string `json:"browser_version"`
	OS             string `json:"os"`
	DeviceType     string `json:"device_type"`

	CreatedAt time.Time `json:"created_at"`
}

func (ReplaySession) TableName() string { return "replay_sessions" }

// PublicSession is the redacted view returned by the public share endpoint.
// It intentionally omits identity (identifier, email, name, start_url) and the
// trigger — only enough to render the player with minimal context.
type PublicSession struct {
	ID          string     `json:"id"` // harmless: /app/sessions/:id is JWT-gated
	ServiceName string     `json:"service_name"`
	Environment string     `json:"environment"`
	StartedAt   time.Time  `json:"started_at"`
	DurationMs  *int64     `json:"duration_ms"`
	EventCount  int        `json:"event_count"`
}

// ToPublic strips everything sensitive from a session.
func (s *ReplaySession) ToPublic() PublicSession {
	return PublicSession{
		ID:          s.ID,
		ServiceName: s.ServiceName,
		Environment: s.Environment,
		StartedAt:   s.StartedAt,
		DurationMs:  s.DurationMs,
		EventCount:  s.EventCount,
	}
}

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
	// Why this batch was uploaded: manual (report) | error (auto) | stream (always mode).
	Trigger      string `json:"trigger"`
	// Client-generated public share token, stable per session. Lets report()
	// return a shareable link without a server round-trip.
	ShareToken   string `json:"share_token"`

	// Client/device metadata, sent once on the first batch. Optional — the SDK
	// omits it when captureClientMetadata is disabled (LGPD/GDPR opt-out).
	Client *ClientMeta `json:"client"`

	// rrweb events batch.
	Events []RawEvent `json:"events" binding:"required,min=1"`
}

// ClientMeta is the raw, untrusted device metadata reported by the browser SDK.
type ClientMeta struct {
	ScreenWidth      int     `json:"screen_width"`
	ScreenHeight     int     `json:"screen_height"`
	ViewportWidth    int     `json:"viewport_width"`
	ViewportHeight   int     `json:"viewport_height"`
	DevicePixelRatio float64 `json:"device_pixel_ratio"`
	Language         string  `json:"language"`
	Timezone         string  `json:"timezone"`
	UserAgent        string  `json:"user_agent"`
}

// Field bounds — the payload is attacker-controlled, so we clamp/truncate
// before anything reaches the database or the UA parser (avoids oversized
// rows and ReDoS via a giant user-agent string).
const (
	maxDimension = 16384 // px — well above any real display
	maxDPR       = 8.0
	maxUALen     = 512
	maxLangLen   = 35 // RFC 5646 language tags are short
	maxTZLen     = 64
)

// Sanitized returns a copy with every field clamped/truncated to safe bounds.
func (c ClientMeta) Sanitized() ClientMeta {
	return ClientMeta{
		ScreenWidth:      clampInt(c.ScreenWidth, 0, maxDimension),
		ScreenHeight:     clampInt(c.ScreenHeight, 0, maxDimension),
		ViewportWidth:    clampInt(c.ViewportWidth, 0, maxDimension),
		ViewportHeight:   clampInt(c.ViewportHeight, 0, maxDimension),
		DevicePixelRatio: clampFloat(c.DevicePixelRatio, 0, maxDPR),
		Language:         truncate(c.Language, maxLangLen),
		Timezone:         truncate(c.Timezone, maxTZLen),
		UserAgent:        truncate(c.UserAgent, maxUALen),
	}
}

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func clampFloat(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

// RawEvent mirrors the minimal rrweb event structure.
type RawEvent struct {
	Type      int             `json:"type"`
	Data      json.RawMessage `json:"data"`
	Timestamp int64           `json:"timestamp"`
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
