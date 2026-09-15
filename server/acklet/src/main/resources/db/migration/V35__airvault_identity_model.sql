-- V35: AirVault Identity & Multi-Device Separation

CREATE TABLE IF NOT EXISTS airvault_identities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username            VARCHAR(60) NOT NULL UNIQUE,
    pin_hash            VARCHAR(120) NOT NULL,
    is_customized       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_airvault_identities_username ON airvault_identities(username);

-- Link airvault_devices to identity
ALTER TABLE airvault_devices
    ADD COLUMN IF NOT EXISTS identity_id UUID REFERENCES airvault_identities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_airvault_devices_identity_id ON airvault_devices(identity_id);

-- Backfill airvault_identities from existing airvault_devices where username is present
INSERT INTO airvault_identities (id, username, pin_hash, is_customized, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    d.username,
    COALESCE(d.pin_hash, '$2a$10$e7YkM8/d2999kGjLgS8cveJ8h7Yq5z6h5h5h5h5h5h5h5h5h5h5h5'),
    COALESCE(d.is_customized, FALSE),
    d.created_at,
    d.updated_at
FROM airvault_devices d
WHERE d.username IS NOT NULL AND d.username != ''
ON CONFLICT (username) DO NOTHING;

-- Backfill foreign key link on airvault_devices
UPDATE airvault_devices d
SET identity_id = i.id
FROM airvault_identities i
WHERE d.username = i.username;
