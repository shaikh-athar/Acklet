-- Online Clipboard persistent storage, upload sessions, and items

DROP TABLE IF EXISTS clipboard_upload_sessions CASCADE;
DROP TABLE IF EXISTS clipboard_items CASCADE;
DROP TABLE IF EXISTS clipboard_shares CASCADE;

CREATE TABLE IF NOT EXISTS clipboard_shares (
    code VARCHAR(32) PRIMARY KEY,
    word_code VARCHAR(64),
    owner_token VARCHAR(64),
    pin_hash VARCHAR(255),
    has_pin BOOLEAN NOT NULL DEFAULT FALSE,
    burn_after_reading BOOLEAN NOT NULL DEFAULT FALSE,
    live_mode BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clipboard_items (
    id VARCHAR(64) PRIMARY KEY,
    share_code VARCHAR(32) NOT NULL REFERENCES clipboard_shares(code) ON DELETE CASCADE,
    item_type VARCHAR(16) NOT NULL,
    text_content TEXT,
    original_name VARCHAR(255),
    size_bytes BIGINT NOT NULL DEFAULT 0,
    detected_mime VARCHAR(128),
    storage_path VARCHAR(512),
    content_hash VARCHAR(64),
    is_compressed BOOLEAN NOT NULL DEFAULT FALSE,
    is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    download_count INT NOT NULL DEFAULT 0,
    view_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clipboard_items_share_code ON clipboard_items(share_code);
CREATE INDEX IF NOT EXISTS idx_clipboard_items_content_hash ON clipboard_items(content_hash);

CREATE TABLE IF NOT EXISTS clipboard_upload_sessions (
    id VARCHAR(64) PRIMARY KEY,
    share_code VARCHAR(32) NOT NULL REFERENCES clipboard_shares(code) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    total_size BIGINT NOT NULL,
    chunk_size INT NOT NULL,
    total_chunks INT NOT NULL,
    uploaded_chunks TEXT NOT NULL DEFAULT '[]',
    file_hash VARCHAR(64),
    is_image BOOLEAN NOT NULL DEFAULT FALSE,
    is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clipboard_sessions_resume ON clipboard_upload_sessions(share_code, file_hash, total_size, status);
CREATE INDEX IF NOT EXISTS idx_clipboard_sessions_cleanup ON clipboard_upload_sessions(status, expires_at);
