CREATE TABLE conversations(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) NOT NULL REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER conversations_set_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- A user's conversations, most recently active first.
CREATE INDEX conversations_username_updated_at_idx ON conversations(username, updated_at DESC);

CREATE TABLE messages(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    -- What a reasoning model thought before writing an assistant message. It is never sent back to the model.
    reasoning TEXT,
    -- The model that wrote an assistant message, since the configured model can change between messages.
    model VARCHAR(256),
    -- How many tokens the message takes up when sent back to the model as history, as reported by LM Studio.
    -- Null when LM Studio did not report it, such as for replies cut short, in which case it is estimated.
    token_count INTEGER,
    -- clock_timestamp() rather than now(), so messages inserted in the same transaction keep their order.
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT messages_role_valid CHECK (role IN ('user', 'assistant')),
    CONSTRAINT messages_model_only_for_assistant CHECK ((role = 'assistant') = (model IS NOT NULL)),
    CONSTRAINT messages_reasoning_only_for_assistant CHECK (role = 'assistant' OR reasoning IS NULL),
    CONSTRAINT messages_token_count_not_negative CHECK (token_count IS NULL OR token_count >= 0)
);

-- The messages of a conversation in the order they were sent.
CREATE INDEX messages_conversation_id_created_at_idx ON messages(conversation_id, created_at);
