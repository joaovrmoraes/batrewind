DROP INDEX IF EXISTS idx_replay_sessions_share_token;

ALTER TABLE replay_sessions DROP COLUMN IF EXISTS share_token;
