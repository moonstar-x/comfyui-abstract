export interface GenericWSClientMessage<TType extends string, TPayload extends object> { payload: TPayload; type: TType }

export interface WorkflowModels {
  'generate-image': 'qwen-image-2.1';
}
export type WorkflowType = keyof WorkflowModels;
export type WorkflowModel<TType extends WorkflowType = WorkflowType> = WorkflowModels[TType];

export type RunWorkflowPayload = { [TType in WorkflowType]: { model?: WorkflowModel<TType>; params: Record<string, unknown>; type: TType } }[WorkflowType];

export type WSClientMessage =
  GenericWSClientMessage<'get_queue', { promptId: string }> |
  GenericWSClientMessage<'get_status', never> |
  GenericWSClientMessage<'run_workflow', RunWorkflowPayload>;
