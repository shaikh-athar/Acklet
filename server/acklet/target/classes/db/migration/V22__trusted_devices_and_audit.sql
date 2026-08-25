-- Migration V22: Enterprise Security Audit Logs and Trusted Devices
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(64) NOT NULL,
    user_id UUID,
    email VARCHAR(255),
    ip_address VARCHAR(45),
    device VARCHAR(255),
    browser VARCHAR(100),
    country VARCHAR(100),
    correlation_id VARCHAR(64),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON security_audit_logs(created_at);

CREATE TABLE IF NOT EXISTS trusted_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    ip_address VARCHAR(45),
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uk_user_device UNIQUE (user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_trusted_device_user ON trusted_devices(user_id);
