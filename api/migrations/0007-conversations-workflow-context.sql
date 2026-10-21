-- The workflow page the conversation was started from, so the model is told about the instructions of that workflow and model.
-- Both are null for conversations started anywhere else. The instructions themselves are read from the config on every message.
ALTER TABLE conversations ADD COLUMN workflow_type VARCHAR(64);
ALTER TABLE conversations ADD COLUMN workflow_model VARCHAR(256);
ALTER TABLE conversations ADD CONSTRAINT conversations_workflow_context_complete CHECK ((workflow_type IS NULL) = (workflow_model IS NULL));
