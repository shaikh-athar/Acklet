-- Migration V23: Drop NOT NULL constraint on legacy refresh_tokens token column
ALTER TABLE refresh_tokens ALTER COLUMN token DROP NOT NULL;
ALTER TABLE refresh_tokens ALTER COLUMN expiry_date DROP NOT NULL;
ALTER TABLE refresh_tokens ALTER COLUMN revoked DROP NOT NULL;
