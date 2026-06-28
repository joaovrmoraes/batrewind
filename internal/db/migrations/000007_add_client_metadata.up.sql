-- Client/device metadata captured by the browser SDK on the first batch.
-- Raw fields come from the client; browser/os/device_type are derived
-- server-side from the user agent (never trusted from the client).
ALTER TABLE replay_sessions ADD COLUMN IF NOT EXISTS screen_width       INTEGER;
ALTER TABLE replay_sessions ADD COLUMN IF NOT EXISTS screen_height      INTEGER;
ALTER TABLE replay_sessions ADD COLUMN IF NOT EXISTS viewport_width     INTEGER;
ALTER TABLE replay_sessions ADD COLUMN IF NOT EXISTS viewport_height    INTEGER;
ALTER TABLE replay_sessions ADD COLUMN IF NOT EXISTS device_pixel_ratio DOUBLE PRECISION;
ALTER TABLE replay_sessions ADD COLUMN IF NOT EXISTS language           TEXT;
ALTER TABLE replay_sessions ADD COLUMN IF NOT EXISTS timezone           TEXT;
ALTER TABLE replay_sessions ADD COLUMN IF NOT EXISTS user_agent         TEXT;
ALTER TABLE replay_sessions ADD COLUMN IF NOT EXISTS browser            TEXT;
ALTER TABLE replay_sessions ADD COLUMN IF NOT EXISTS browser_version    TEXT;
ALTER TABLE replay_sessions ADD COLUMN IF NOT EXISTS os                 TEXT;
ALTER TABLE replay_sessions ADD COLUMN IF NOT EXISTS device_type        TEXT;

CREATE INDEX IF NOT EXISTS idx_replay_sessions_browser     ON replay_sessions (browser);
CREATE INDEX IF NOT EXISTS idx_replay_sessions_device_type ON replay_sessions (device_type);
