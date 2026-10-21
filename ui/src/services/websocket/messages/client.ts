export interface GenericWSClientMessage<TType extends string, TPayload extends object> { payload?: TPayload; type: TType }

export const WORKFLOW_TYPES = ['image-generate', 'image-edit', 'image-upscale', 'music-generate', 'music-cover'] as const;
export type WorkflowType = typeof WORKFLOW_TYPES[number];

export interface RunWorkflowPayload {
  // Alias of the workflow model, as defined in the API config.
  model: string;
  params: Record<string, unknown>;
  type: WorkflowType;
}

export type WSClientMessage =
  GenericWSClientMessage<'cancel_run', { promptId: string }> |
  GenericWSClientMessage<'comfyui_free_up_memory', never> |
  GenericWSClientMessage<'get_queue', { promptId: string }> |
  // The prompt IDs are the runs being followed, whose results are sent back if they finished while the connection was down.
  GenericWSClientMessage<'get_runs', { promptIds: string[] }> |
  GenericWSClientMessage<'get_status', never> |
  GenericWSClientMessage<'run_workflow', RunWorkflowPayload>;
