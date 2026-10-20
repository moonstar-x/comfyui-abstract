-- When the user pinned the conversation to the top of their list, or null when it is not pinned.
ALTER TABLE conversations ADD COLUMN pinned_at TIMESTAMPTZ;

-- Pinning is not activity, so it must not bump the conversation within its group of the list.
DROP TRIGGER conversations_set_updated_at ON conversations;
CREATE TRIGGER conversations_set_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    WHEN (OLD.pinned_at IS NOT DISTINCT FROM NEW.pinned_at)
    EXECUTE FUNCTION set_updated_at();

-- A user's conversations, pinned first, then most recently active first.
DROP INDEX conversations_username_updated_at_idx;
CREATE INDEX conversations_username_pinned_updated_at_idx ON conversations(username, (pinned_at IS NULL), updated_at DESC, id DESC);
