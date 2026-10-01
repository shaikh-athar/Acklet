-- V18: Add OTP resend rate-limiting columns
ALTER TABLE otps
    ADD COLUMN IF NOT EXISTS resend_count       INTEGER   NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_resend_allowed_at TIMESTAMPTZ;
