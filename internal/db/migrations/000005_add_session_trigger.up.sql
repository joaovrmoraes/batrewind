ALTER TABLE replay_sessions ADD COLUMN IF NOT EXISTS trigger TEXT NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_replay_sessions_trigger ON replay_sessions (trigger);
