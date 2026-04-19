CREATE TABLE IF NOT EXISTS failed_ingest (
    id          TEXT PRIMARY KEY,
    session_id  TEXT NOT NULL,
    payload     TEXT NOT NULL,
    error       TEXT NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    resolved    INTEGER NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_failed_ingest_resolved ON failed_ingest (resolved);
