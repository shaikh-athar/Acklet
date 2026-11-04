-- ============================================================================
-- V59: Acklet Barcode Generator Temporary Barcodes - Batch Support
-- Adds batch_id and idempotency_key to temp_codes for bulk operations.
-- ============================================================================

ALTER TABLE temp_codes ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE temp_codes ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_temp_codes_batch_id ON temp_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_temp_codes_owner_batch ON temp_codes(owner_token_hash, batch_id);
CREATE INDEX IF NOT EXISTS idx_temp_codes_idempotency ON temp_codes(owner_token_hash, idempotency_key);

