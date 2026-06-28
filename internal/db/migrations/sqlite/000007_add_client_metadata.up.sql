-- Client/device metadata captured by the browser SDK on the first batch.
-- browser/os/device_type are derived server-side from the user agent.
ALTER TABLE replay_sessions ADD COLUMN screen_width       INTEGER;
ALTER TABLE replay_sessions ADD COLUMN screen_height      INTEGER;
ALTER TABLE replay_sessions ADD COLUMN viewport_width     INTEGER;
ALTER TABLE replay_sessions ADD COLUMN viewport_height    INTEGER;
ALTER TABLE replay_sessions ADD COLUMN device_pixel_ratio REAL;
ALTER TABLE replay_sessions ADD COLUMN language           TEXT;
ALTER TABLE replay_sessions ADD COLUMN timezone           TEXT;
ALTER TABLE replay_sessions ADD COLUMN user_agent         TEXT;
ALTER TABLE replay_sessions ADD COLUMN browser            TEXT;
ALTER TABLE replay_sessions ADD COLUMN browser_version    TEXT;
ALTER TABLE replay_sessions ADD COLUMN os                 TEXT;
ALTER TABLE replay_sessions ADD COLUMN device_type        TEXT;

CREATE INDEX IF NOT EXISTS idx_replay_sessions_browser     ON replay_sessions (browser);
CREATE INDEX IF NOT EXISTS idx_replay_sessions_device_type ON replay_sessions (device_type);
