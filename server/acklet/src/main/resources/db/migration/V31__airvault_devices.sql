-- V31: AirVault Constellation Devices Table
CREATE TABLE IF NOT EXISTS airvault_devices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_device_id    VARCHAR(100) NOT NULL,
    device_name         VARCHAR(120) NOT NULL,
    device_type         VARCHAR(50) NOT NULL,
    os                  VARCHAR(80),
    browser             VARCHAR(80),
    thumbprint          VARCHAR(100),
    ip_hint             VARCHAR(80),
    status              VARCHAR(40) NOT NULL DEFAULT 'active',
    last_active_at      TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(255),
    updated_by          VARCHAR(255),
    deleted_at          TIMESTAMP WITH TIME ZONE,

    CONSTRAINT uq_airvault_devices_user_client UNIQUE (user_id, client_device_id)
);

CREATE INDEX IF NOT EXISTS idx_airvault_devices_user_id ON airvault_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_airvault_devices_status ON airvault_devices(status);
