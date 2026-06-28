DROP INDEX IF EXISTS idx_replay_sessions_device_type;
DROP INDEX IF EXISTS idx_replay_sessions_browser;

ALTER TABLE replay_sessions DROP COLUMN IF EXISTS device_type;
ALTER TABLE replay_sessions DROP COLUMN IF EXISTS os;
ALTER TABLE replay_sessions DROP COLUMN IF EXISTS browser_version;
ALTER TABLE replay_sessions DROP COLUMN IF EXISTS browser;
ALTER TABLE replay_sessions DROP COLUMN IF EXISTS user_agent;
ALTER TABLE replay_sessions DROP COLUMN IF EXISTS timezone;
ALTER TABLE replay_sessions DROP COLUMN IF EXISTS language;
ALTER TABLE replay_sessions DROP COLUMN IF EXISTS device_pixel_ratio;
ALTER TABLE replay_sessions DROP COLUMN IF EXISTS viewport_height;
ALTER TABLE replay_sessions DROP COLUMN IF EXISTS viewport_width;
ALTER TABLE replay_sessions DROP COLUMN IF EXISTS screen_height;
ALTER TABLE replay_sessions DROP COLUMN IF EXISTS screen_width;
