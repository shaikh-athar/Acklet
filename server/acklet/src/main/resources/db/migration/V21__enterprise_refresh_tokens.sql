-- Migration V21: Upgrade refresh_tokens table schema for enterprise security features
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS family_id UUID DEFAULT uuid_generate_v4();
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS device_name VARCHAR(255);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS location VARCHAR(100);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT FALSE;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Populate default token_hash for existing legacy rows if any
UPDATE refresh_tokens SET token_hash = md5(random()::text || clock_timestamp()::text || COALESCE(id::text, '')) WHERE token_hash IS NULL;

-- Backfill legacy column mappings
UPDATE refresh_tokens SET is_revoked = revoked WHERE revoked IS NOT NULL;
UPDATE refresh_tokens SET expires_at = expiry_date WHERE expiry_date IS NOT NULL;

-- Add unique constraint on token_hash
ALTER TABLE refresh_tokens ADD CONSTRAINT uk_refresh_tokens_token_hash UNIQUE (token_hash);

-- Set non-nullable constraints
ALTER TABLE refresh_tokens ALTER COLUMN token_hash SET NOT NULL;
ALTER TABLE refresh_tokens ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE refresh_tokens ALTER COLUMN is_revoked SET NOT NULL;
ALTER TABLE refresh_tokens ALTER COLUMN expires_at SET NOT NULL;
ALTER TABLE refresh_tokens ALTER COLUMN last_used_at SET NOT NULL;
ALTER TABLE refresh_tokens ALTER COLUMN created_at SET NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_refresh_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_token_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_family ON refresh_tokens(family_id);
