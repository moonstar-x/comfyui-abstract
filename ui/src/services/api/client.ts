import { API_URL } from '@core/config/environment';
import type { Nullable } from '@core/utils/types';
import { getSession, setSession } from '@services/auth/session';

// Keep in sync with api/src/app/http/errors/ErrorCodes.ts.
export const ApiErrorCodes = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  LMSTUDIO_UNAVAILABLE: 'LMSTUDIO_UNAVAILABLE',
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  SESSION_INVALID: 'SESSION_INVALID',
  SESSION_NOT_PROVIDED: 'SESSION_NOT_PROVIDED',
  SIGNUP_DISABLED: 'SIGNUP_DISABLED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USERNAME_RESERVED: 'USERNAME_RESERVED'
} as const;

export const SESSION_ERROR_CODES: ReadonlySet<string> = new Set([ApiErrorCodes.SESSION_INVALID, ApiErrorCodes.SESSION_NOT_PROVIDED]);

export interface ApiErrorOptions extends ErrorOptions {
  code: string;
  status: number;
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, options: ApiErrorOptions) {
    super(message, options);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
  }
}

interface ErrorPayload {
  code: Nullable<string>;
  message: Nullable<string>;
}

const getErrorPayload = (body: unknown): ErrorPayload => {
  if (typeof body !== 'object' || body === null || !('error' in body) || typeof body.error !== 'object' || body.error === null) {
    return { code: null, message: null };
  }

  return {
    code: 'code' in body.error && typeof body.error.code === 'string' ? body.error.code : null,
    message: 'message' in body.error && typeof body.error.message === 'string' ? body.error.message : null
  };
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export interface ApiRequestOptions {
  // Sent as JSON.
  body?: unknown;
  // Sent as the raw body with its own content type, takes precedence over body.
  file?: Blob;
  isAuthenticated?: boolean;
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
  // Cancels the request, including a response that is still being streamed.
  signal?: AbortSignal;
}

const buildRequestInit = ({ body, file, isAuthenticated = false, method = 'GET', signal }: ApiRequestOptions): RequestInit => {
  const headers = new Headers();
  const init: RequestInit = { method, headers };
  if (signal !== undefined) {
    init.signal = signal;
  }

  if (file !== undefined) {
    headers.set('Content-Type', file.type);
    init.body = file;
  } else if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(body);
  }

  const token = isAuthenticated ? getSession()?.token : undefined;
  if (token !== undefined) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return init;
};

// Keep in sync with API_ROUTE in api/src/app/express/app.ts.
const API_ROUTE = '/api';

const send = async (path: string, init: RequestInit): Promise<Response> => {
  try {
    return await fetch(new URL(`${API_ROUTE}${path}`, API_URL), init);
  } catch (error) {
    // Aborting is not a connection problem, so the caller gets the abort as is.
    if (init.signal?.aborted === true) {
      throw error;
    }

    throw new ApiError('Could not reach the server.', { code: ApiErrorCodes.UNKNOWN_ERROR, status: 0, cause: error });
  }
};

export interface ApiResponse {
  data: unknown;
  meta: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Authenticated requests clear the stored session when the API rejects the token, which sends the user back to the login page.
 */
const throwApiError = (response: Response, body: unknown, options: ApiRequestOptions): never => {
  const { code, message } = getErrorPayload(body);
  if (code !== null && options.isAuthenticated === true && SESSION_ERROR_CODES.has(code)) {
    setSession(null);
  }

  throw new ApiError(message ?? `Request failed (HTTP ${response.status.toString()}).`, {
    code: code ?? ApiErrorCodes.UNKNOWN_ERROR,
    status: response.status
  });
};

/**
 * Sends a request to the API and returns the data and meta fields of the response body.
 */
export const apiRequestWithMeta = async (path: string, options: ApiRequestOptions = {}): Promise<ApiResponse> => {
  const response = await send(path, buildRequestInit(options));
  const body = await readJson(response);
  if (response.ok) {
    return {
      data: isRecord(body) ? body['data'] ?? null : null,
      meta: isRecord(body) && isRecord(body['meta']) ? body['meta'] : {}
    };
  }

  return throwApiError(response, body, options);
};

/**
 * Sends a request to an API endpoint that responds with a raw file instead of JSON, and returns the file.
 */
export const apiRequestFile = async (path: string, options: ApiRequestOptions = {}): Promise<Blob> => {
  const response = await send(path, buildRequestInit(options));
  if (response.ok) {
    return await response.blob();
  }

  return throwApiError(response, await readJson(response), options);
};

/**
 * Sends a request to an API endpoint that streams its response, such as server-sent events, and returns the body as it arrives.
 */
export const apiRequestStream = async (path: string, options: ApiRequestOptions = {}): Promise<ReadableStream<Uint8Array>> => {
  const response = await send(path, buildRequestInit(options));
  if (response.ok && response.body !== null) {
    return response.body;
  }

  return throwApiError(response, await readJson(response), options);
};

/**
 * Sends a request to the API and returns the data field of the response body.
 */
export const apiRequest = async (path: string, options: ApiRequestOptions = {}): Promise<unknown> => {
  const { data } = await apiRequestWithMeta(path, options);
  return data;
};
