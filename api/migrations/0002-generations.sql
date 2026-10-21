CREATE TABLE media_types(
    name VARCHAR(32) PRIMARY KEY
);

INSERT INTO media_types(name) VALUES ('image'), ('audio');

CREATE TABLE generations(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) NOT NULL REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE,
    prompt_id TEXT NOT NULL UNIQUE,
    media_type VARCHAR(32) NOT NULL REFERENCES media_types(name) ON UPDATE CASCADE,
    workflow_type VARCHAR(64) NOT NULL,
    workflow_id VARCHAR(128) NOT NULL,
    model VARCHAR(128) NOT NULL,
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    outputs TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT generations_started_after_created CHECK (started_at IS NULL OR started_at >= created_at),
    CONSTRAINT generations_completed_after_created CHECK (completed_at >= created_at),
    CONSTRAINT generations_completed_after_started CHECK (started_at IS NULL OR completed_at >= started_at)
);

-- A user's history, optionally filtered by media type.
CREATE INDEX generations_username_created_at_idx ON generations(username, created_at DESC);
CREATE INDEX generations_username_media_type_created_at_idx ON generations(username, media_type, created_at DESC);

-- Everyone's history, optionally filtered by media type.
CREATE INDEX generations_created_at_idx ON generations(created_at DESC);
CREATE INDEX generations_media_type_created_at_idx ON generations(media_type, created_at DESC);
