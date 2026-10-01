-- V42: AirVault Device Pairings Architecture
-- Represents explicit device-to-device authorized pairing relationships with independent connection states.

CREATE TABLE IF NOT EXISTS airvault_device_pairings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_device_id UUID NOT NULL REFERENCES airvault_devices(id) ON DELETE CASCADE,
    target_device_id UUID NOT NULL REFERENCES airvault_devices(id) ON DELETE CASCADE,
    source_client_device_id VARCHAR(100) NOT NULL,
    target_client_device_id VARCHAR(100) NOT NULL,
    pairing_state VARCHAR(40) NOT NULL DEFAULT 'CONNECTED', -- CONNECTED, PAUSED_DISCONNECTED, REVOKED
    sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    established_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_device_pairings_source_target UNIQUE (source_device_id, target_device_id)
);

CREATE INDEX IF NOT EXISTS idx_airvault_pairings_source_client ON airvault_device_pairings(source_client_device_id);
CREATE INDEX IF NOT EXISTS idx_airvault_pairings_target_client ON airvault_device_pairings(target_client_device_id);
CREATE INDEX IF NOT EXISTS idx_airvault_pairings_state ON airvault_device_pairings(pairing_state);

-- Backfill existing pairings from airvault_identities.paired_identity_id
INSERT INTO airvault_device_pairings (
    source_device_id,
    target_device_id,
    source_client_device_id,
    target_client_device_id,
    pairing_state,
    sync_enabled,
    established_at,
    created_at,
    updated_at
)
SELECT DISTINCT
    d1.id AS source_device_id,
    d2.id AS target_device_id,
    d1.client_device_id AS source_client_device_id,
    d2.client_device_id AS target_client_device_id,
    'CONNECTED' AS pairing_state,
    COALESCE(d1.sync_enabled, TRUE) AS sync_enabled,
    CURRENT_TIMESTAMP AS established_at,
    CURRENT_TIMESTAMP AS created_at,
    CURRENT_TIMESTAMP AS updated_at
FROM airvault_identities i1
JOIN airvault_identities i2 ON i1.paired_identity_id = i2.id
JOIN airvault_devices d1 ON d1.identity_id = i1.id
JOIN airvault_devices d2 ON d2.identity_id = i2.id
WHERE d1.id != d2.id
  AND d1.status != 'revoked'
  AND d2.status != 'revoked'
ON CONFLICT (source_device_id, target_device_id) DO NOTHING;
