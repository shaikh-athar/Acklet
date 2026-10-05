-- V42: Add batch_id to AirVault Upload Sessions and Clipboard Files Tables

ALTER TABLE airvault_upload_sessions 
    ADD COLUMN IF NOT EXISTS batch_id VARCHAR(100);

ALTER TABLE airvault_clipboard_files 
    ADD COLUMN IF NOT EXISTS batch_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_airvault_upload_sessions_batch_id 
    ON airvault_upload_sessions(batch_id);

CREATE INDEX IF NOT EXISTS idx_airvault_clipboard_files_batch_id 
    ON airvault_clipboard_files(batch_id);
