-- Signed into every token and checked on each request. Raising it, as changing the password does, revokes every token issued before.
ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
