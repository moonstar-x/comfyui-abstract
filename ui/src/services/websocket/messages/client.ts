export interface GenericWSClientMessage<TType extends string, TPayload extends object> { payload: TPayload; type: TType }

export type WorkflowType = 'generate-image';
export type WorkflowModel = 'qwen-image-2.1';

export interface RunWorkflowPayload {
  model?: WorkflowModel;
  params: Record<string, unknown>;
  type: WorkflowType;
}

export type WSClientMessage =
  GenericWSClientMessage<'get_queue', { promptId: string }> |
  GenericWSClientMessage<'get_status', never> |
  GenericWSClientMessage<'run_workflow', RunWorkflowPayload>;
