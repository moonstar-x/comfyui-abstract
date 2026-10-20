-- A user's history of a single workflow and model, such as the previous generations shown on a workflow page.
CREATE INDEX generations_username_workflow_type_model_created_at_idx ON generations(username, workflow_type, model, created_at DESC);
