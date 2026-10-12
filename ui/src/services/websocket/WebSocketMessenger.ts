import { getSession } from '@services/auth/session';
import type { WSClientMessage } from '@services/websocket/messages/client';
import type { WSServerMessage, WSServerMessageOfType, WSServerMessageType } from '@services/websocket/messages/server';

export type WSSendFunction = (message: string) => void;
export type WSMessageListener<TMessage extends WSServerMessage = WSServerMessage> = (message: TMessage) => void;
export type WSUnsubscribe = () => void;

const SERVER_MESSAGE_TYPES: ReadonlySet<string> = new Set<WSServerMessageType>(['error', 'queue', 'session', 'status', 'workflow_complete', 'workflow_error', 'workflow_progress', 'workflow_start']);

const isMessageOfType = <TType extends WSServerMessageType>(message: WSServerMessage, type: TType): message is WSServerMessageOfType<TType> => message.type === type;

const isServerMessage = (value: unknown): value is WSServerMessage => typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  typeof value.type === 'string' &&
  SERVER_MESSAGE_TYPES.has(value.type) &&
  'payload' in value &&
  typeof value.payload === 'object' &&
  value.payload !== null;

const parseIncomingMessage = (raw: unknown): null | WSServerMessage => {
  if (typeof raw !== 'string') {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isServerMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export class WebSocketMessenger {
  private readonly _listeners: Set<WSMessageListener>;
  private _send: null | WSSendFunction;

  constructor() {
    this._listeners = new Set();
    this._send = null;
  }

  public attach(send: WSSendFunction): void {
    this._send = send;
  }

  public detach(): void {
    this._send = null;
  }

  public handleRawIncomingMessage(raw: unknown): void {
    const message = parseIncomingMessage(raw);
    if (message === null) {
      console.warn('Received malformed WebSocket message.', raw);
      return;
    }

    for (const listener of this._listeners) {
      listener(message);
    }
  }

  public on<TType extends WSServerMessageType>(type: TType, listener: WSMessageListener<WSServerMessageOfType<TType>>): WSUnsubscribe {
    return this.subscribe((message) => {
      if (isMessageOfType(message, type)) {
        listener(message);
      }
    });
  }

  public send(message: WSClientMessage): void {
    if (this._send === null) {
      throw new Error('Attempted to send a WebSocket message without an attached connection.');
    }

    const token = getSession()?.token;
    if (token === undefined) {
      throw new Error('Attempted to send a WebSocket message without a session.');
    }

    // The server authenticates every message on its own, so the token travels with each one.
    this._send(JSON.stringify({ ...message, token }));
  }

  public subscribe(listener: WSMessageListener): WSUnsubscribe {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }
}
