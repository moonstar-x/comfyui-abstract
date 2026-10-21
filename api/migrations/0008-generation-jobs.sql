-- Workflows queued in ComfyUI whose outputs have not been saved yet. They are kept apart from generations so the history only ever
-- lists finished generations. A job moves to generations once its outputs are saved and is dropped if it fails, so the jobs left
-- over when the API stops are picked up again on the next start, including the ones ComfyUI finished in the meantime.
CREATE TABLE generation_jobs(
    prompt_id TEXT PRIMARY KEY,
    username VARCHAR(64) NOT NULL REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE,
    workflow_type VARCHAR(64) NOT NULL,
    workflow_id VARCHAR(128) NOT NULL,
    model VARCHAR(128) NOT NULL,
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Where the outputs are listed in the ComfyUI history. Stored so a job can still be finished if the config changes while it runs.
    output_node_id VARCHAR(128) NOT NULL,
    output_kind VARCHAR(16) NOT NULL,
    -- Number of nodes in the queued prompt, which the progress is counted against.
    node_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    CONSTRAINT generation_jobs_output_kind CHECK (output_kind IN ('images', 'audio')),
    CONSTRAINT generation_jobs_started_after_created CHECK (started_at IS NULL OR started_at >= created_at)
);
