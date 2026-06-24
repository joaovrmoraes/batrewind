DROP INDEX IF EXISTS idx_replay_sessions_trigger;

ALTER TABLE replay_sessions DROP COLUMN trigger;
