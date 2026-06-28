DROP INDEX IF EXISTS idx_replay_sessions_device_type;
DROP INDEX IF EXISTS idx_replay_sessions_browser;

ALTER TABLE replay_sessions DROP COLUMN device_type;
ALTER TABLE replay_sessions DROP COLUMN os;
ALTER TABLE replay_sessions DROP COLUMN browser_version;
ALTER TABLE replay_sessions DROP COLUMN browser;
ALTER TABLE replay_sessions DROP COLUMN user_agent;
ALTER TABLE replay_sessions DROP COLUMN timezone;
ALTER TABLE replay_sessions DROP COLUMN language;
ALTER TABLE replay_sessions DROP COLUMN device_pixel_ratio;
ALTER TABLE replay_sessions DROP COLUMN viewport_height;
ALTER TABLE replay_sessions DROP COLUMN viewport_width;
ALTER TABLE replay_sessions DROP COLUMN screen_height;
ALTER TABLE replay_sessions DROP COLUMN screen_width;
