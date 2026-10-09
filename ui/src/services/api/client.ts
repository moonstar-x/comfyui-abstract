import { API_URL } from '@core/config/environment';
import type { Nullable } from '@core/utils/types';
import { getSession, setSession } from '@services/auth/session';

// Keep in sync with api/src/app/http/errors/ErrorCodes.ts.
export const ApiErrorCodes = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_INVALID: 'SESSION_INVALID',
  SESSION_NOT_PROVIDED: 'SESSION_NOT_PROVIDED',
  SIGNUP_DISABLED: 'SIGNUP_DISABLED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
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
  body?: unknown;
  isAuthenticated?: boolean;
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
}

const buildRequestInit = ({ body, isAuthenticated = false, method = 'GET' }: ApiRequestOptions): RequestInit => {
  const headers = new Headers();
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(body);
  }

  const token = isAuthenticated ? getSession()?.token : undefined;
  if (token !== undefined) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return init;
};

const send = async (path: string, init: RequestInit): Promise<Response> => {
  try {
    return await fetch(new URL(path, API_URL), init);
  } catch (error) {
    throw new ApiError('Could not reach the server.', { code: ApiErrorCodes.UNKNOWN_ERROR, status: 0, cause: error });
  }
};

/**
 * Sends a request to the API and returns the data field of the response body.
 * Authenticated requests clear the stored session when the API rejects the token, which sends the user back to the login page.
 */
export const apiRequest = async (path: string, options: ApiRequestOptions = {}): Promise<unknown> => {
  const response = await send(path, buildRequestInit(options));
  const body = await readJson(response);
  if (response.ok) {
    return typeof body === 'object' && body !== null && 'data' in body ? body.data : null;
  }

  const { code, message } = getErrorPayload(body);
  if (code !== null && options.isAuthenticated === true && SESSION_ERROR_CODES.has(code)) {
    setSession(null);
  }

  throw new ApiError(message ?? `Request failed (HTTP ${response.status.toString()}).`, {
    code: code ?? ApiErrorCodes.UNKNOWN_ERROR,
    status: response.status
  });
};
