export interface GenericWSServerMessage<TType extends string, TData extends object> { payload: TData; type: TType }

export type WSServerMessage =
  GenericWSServerMessage<'error', { message: string }> |
  GenericWSServerMessage<'health', { online: boolean }> |
  GenericWSServerMessage<'session', { clientId: string }>;

export type WSServerMessageType = WSServerMessage['type'];
export type WSServerMessageOfType<TType extends WSServerMessageType> = Extract<WSServerMessage, { type: TType }>;
