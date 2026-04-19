CREATE TABLE IF NOT EXISTS replay_events (
    id          TEXT PRIMARY KEY,
    session_id  TEXT NOT NULL REFERENCES replay_sessions(id) ON DELETE CASCADE,
    seq         INTEGER NOT NULL,
    type        INTEGER NOT NULL,
    data        TEXT NOT NULL,
    timestamp   INTEGER NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_replay_events_session_id ON replay_events (session_id, seq);
