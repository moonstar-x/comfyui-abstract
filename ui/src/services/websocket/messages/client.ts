export interface GenericWSClientMessage<TType extends string, TPayload extends object> { payload: TPayload; type: TType }

export const WORKFLOW_TYPES = ['generate-image', 'edit-image', 'generate-audio'] as const;
export type WorkflowType = typeof WORKFLOW_TYPES[number];

export interface RunWorkflowPayload {
  // Alias of the workflow model, as defined in the API config.
  model: string;
  params: Record<string, unknown>;
  type: WorkflowType;
}

export type WSClientMessage =
  GenericWSClientMessage<'get_queue', { promptId: string }> |
  GenericWSClientMessage<'get_status', never> |
  GenericWSClientMessage<'run_workflow', RunWorkflowPayload>;
