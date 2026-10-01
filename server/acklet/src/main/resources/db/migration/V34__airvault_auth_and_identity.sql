-- V34: Add username, pin_hash, device_keyword, and is_customized to airvault_devices
ALTER TABLE airvault_devices
    ADD COLUMN IF NOT EXISTS username VARCHAR(60) UNIQUE,
    ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(120),
    ADD COLUMN IF NOT EXISTS device_keyword VARCHAR(60),
    ADD COLUMN IF NOT EXISTS is_customized BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_airvault_devices_username ON airvault_devices(username);
