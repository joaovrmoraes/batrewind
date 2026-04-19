CREATE TABLE IF NOT EXISTS replay_sessions (
    id              TEXT PRIMARY KEY,
    bat_session_id  TEXT,
    identifier      TEXT NOT NULL,
    user_email      TEXT,
    user_name       TEXT,
    start_url       TEXT,
    environment     TEXT NOT NULL DEFAULT 'production',
    service_name    TEXT NOT NULL,
    started_at      DATETIME NOT NULL,
    ended_at        DATETIME,
    duration_ms     INTEGER,
    event_count     INTEGER NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_replay_sessions_identifier ON replay_sessions (identifier);
CREATE INDEX IF NOT EXISTS idx_replay_sessions_bat_session_id ON replay_sessions (bat_session_id);
CREATE INDEX IF NOT EXISTS idx_replay_sessions_started_at ON replay_sessions (started_at);
