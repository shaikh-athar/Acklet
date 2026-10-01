-- V32: AirVault Upload Sessions and Clipboard Files Tables

CREATE TABLE IF NOT EXISTS airvault_upload_sessions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clipboard_id            VARCHAR(100) NOT NULL,
    file_id                 VARCHAR(100) NOT NULL,
    file_name               VARCHAR(255) NOT NULL,
    category                VARCHAR(50),
    declared_size           BIGINT NOT NULL,
    received_bytes          BIGINT NOT NULL DEFAULT 0,
    status                  VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    chunk_size              INTEGER NOT NULL,
    total_chunks            INTEGER NOT NULL,
    chunks_received_count   INTEGER NOT NULL DEFAULT 0,
    received_chunk_indices  TEXT DEFAULT '',
    checksum                VARCHAR(120),
    preview_url             TEXT,
    storage_path            VARCHAR(500),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by              VARCHAR(255),
    updated_by              VARCHAR(255),
    deleted_at              TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_airvault_upload_sessions_clipboard_id ON airvault_upload_sessions(clipboard_id);
CREATE INDEX IF NOT EXISTS idx_airvault_upload_sessions_file_id ON airvault_upload_sessions(file_id);
CREATE INDEX IF NOT EXISTS idx_airvault_upload_sessions_status ON airvault_upload_sessions(status);
CREATE INDEX IF NOT EXISTS idx_airvault_upload_sessions_created_at ON airvault_upload_sessions(created_at);

CREATE TABLE IF NOT EXISTS airvault_clipboard_files (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clipboard_id            VARCHAR(100) NOT NULL,
    file_id                 VARCHAR(100) NOT NULL,
    file_name               VARCHAR(255) NOT NULL,
    category                VARCHAR(50) NOT NULL,
    byte_size               BIGINT NOT NULL,
    checksum                VARCHAR(120),
    storage_path            VARCHAR(500),
    preview_url             TEXT,
    sender_device_id        VARCHAR(100),
    sender_device_name      VARCHAR(120),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by              VARCHAR(255),
    updated_by              VARCHAR(255),
    deleted_at              TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_airvault_clipboard_files_clipboard_id ON airvault_clipboard_files(clipboard_id);
CREATE INDEX IF NOT EXISTS idx_airvault_clipboard_files_file_id ON airvault_clipboard_files(file_id);
CREATE INDEX IF NOT EXISTS idx_airvault_clipboard_files_created_at ON airvault_clipboard_files(created_at);
