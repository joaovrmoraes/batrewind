CREATE TABLE IF NOT EXISTS replay_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bat_session_id  TEXT,
    identifier      TEXT NOT NULL,
    user_email      TEXT,
    user_name       TEXT,
    start_url       TEXT,
    environment     TEXT NOT NULL DEFAULT 'production',
    service_name    TEXT NOT NULL,
    started_at      TIMESTAMPTZ NOT NULL,
    ended_at        TIMESTAMPTZ,
    duration_ms     BIGINT,
    event_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replay_sessions_identifier ON replay_sessions (identifier);
CREATE INDEX IF NOT EXISTS idx_replay_sessions_bat_session_id ON replay_sessions (bat_session_id);
CREATE INDEX IF NOT EXISTS idx_replay_sessions_started_at ON replay_sessions (started_at DESC);
