CREATE TABLE IF NOT EXISTS failed_ingest (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  TEXT NOT NULL,
    payload     JSONB NOT NULL,
    error       TEXT NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    resolved    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_failed_ingest_resolved ON failed_ingest (resolved);
