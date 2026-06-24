ALTER TABLE replay_sessions ADD COLUMN share_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_replay_sessions_share_token
  ON replay_sessions (share_token);
