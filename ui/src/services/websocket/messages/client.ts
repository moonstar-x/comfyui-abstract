export interface GenericWSClientMessage<TType extends string, TPayload extends object> { payload?: TPayload; type: TType }

export type WSClientMessage = GenericWSClientMessage<'get_status', never>;
