DROP INDEX IF EXISTS idx_replay_sessions_share_token;

ALTER TABLE replay_sessions DROP COLUMN share_token;
