CREATE TABLE IF NOT EXISTS replay_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES replay_sessions(id) ON DELETE CASCADE,
    seq         INTEGER NOT NULL,
    type        INTEGER NOT NULL,
    data        JSONB NOT NULL,
    timestamp   BIGINT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replay_events_session_id ON replay_events (session_id, seq);
