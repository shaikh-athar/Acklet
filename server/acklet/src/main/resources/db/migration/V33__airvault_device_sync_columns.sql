-- V33: Add sync_enabled and accent_color to airvault_devices
ALTER TABLE airvault_devices
    ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS accent_color VARCHAR(30) DEFAULT '#2196F3';
