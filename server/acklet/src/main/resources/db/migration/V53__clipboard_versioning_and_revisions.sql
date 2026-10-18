-- Online Clipboard Monotonic Versioning and Revision History

ALTER TABLE clipboard_shares ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS clipboard_text_revisions (
    id VARCHAR(64) PRIMARY KEY,
    share_code VARCHAR(32) NOT NULL REFERENCES clipboard_shares(code) ON DELETE CASCADE,
    version BIGINT NOT NULL,
    text_content TEXT NOT NULL,
    is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clipboard_revisions_share ON clipboard_text_revisions(share_code, version DESC);
