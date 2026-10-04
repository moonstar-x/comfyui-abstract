export interface GenericWSServerMessage<TType extends string, TData extends object> { payload: TData; type: TType }
export type WSServerMessage =
  GenericWSServerMessage<'error', { message: string }> |
  GenericWSServerMessage<'health', { online: boolean }> |
  GenericWSServerMessage<'session', { clientId: string }>;
