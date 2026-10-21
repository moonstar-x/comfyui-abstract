CREATE TABLE user_uploads(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) NOT NULL REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE,
    comfy_filename TEXT NOT NULL UNIQUE,
    media_type VARCHAR(32) NOT NULL REFERENCES media_types(name) ON UPDATE CASCADE,
    mime_type VARCHAR(128) NOT NULL,
    size_bytes BIGINT NOT NULL,
    original_filename TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uploads_size_bytes_positive CHECK (size_bytes > 0)
);

-- A user's uploads, optionally filtered by media type.
CREATE INDEX uploads_username_created_at_idx ON user_uploads(username, created_at DESC);
CREATE INDEX uploads_username_media_type_created_at_idx ON user_uploads(username, media_type, created_at DESC);
