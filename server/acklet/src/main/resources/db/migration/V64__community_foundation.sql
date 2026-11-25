-- V64__community_foundation.sql
-- Acklet Community Platform: Published Versioning, Author Following, Bookmarks, Reading History & Notifications

-- 1. Published Content Snapshot on doc_documents (preserves live published state while draft edits occur)
ALTER TABLE doc_documents ADD COLUMN IF NOT EXISTS published_content JSONB;

-- 2. Bio and Username on user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username) WHERE username IS NOT NULL;

-- 3. Author Following
CREATE TABLE IF NOT EXISTS doc_author_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_doc_author_follows UNIQUE (follower_id, author_id),
    CONSTRAINT chk_doc_author_not_self CHECK (follower_id <> author_id)
);

CREATE INDEX IF NOT EXISTS idx_doc_author_follows_follower ON doc_author_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_doc_author_follows_author ON doc_author_follows(author_id);

-- 4. Document Bookmarks
CREATE TABLE IF NOT EXISTS doc_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES doc_documents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_doc_bookmarks UNIQUE (user_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_doc_bookmarks_user ON doc_bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_bookmarks_document ON doc_bookmarks(document_id);

-- 5. Reading History
CREATE TABLE IF NOT EXISTS doc_reading_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES doc_documents(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_doc_reading_history UNIQUE (user_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_doc_reading_history_user ON doc_reading_history(user_id, last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_reading_history_doc ON doc_reading_history(document_id);

-- 6. Notifications
CREATE TABLE IF NOT EXISTS doc_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_notifications_user_read ON doc_notifications(user_id, read, created_at DESC);
