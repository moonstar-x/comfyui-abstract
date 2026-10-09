import type { Nullable } from '@core/utils/types';

const STORAGE_KEY = 'comfyui-abstract-session';

export interface PublicUser {
  createdAt: string;
  pictureUrl: Nullable<string>;
  updatedAt: string;
  username: string;
}

export interface Session {
  token: string;
  user: PublicUser;
}

const isPublicUser = (value: unknown): value is PublicUser => typeof value === 'object' &&
  value !== null &&
  'username' in value &&
  typeof value.username === 'string';

export const isSession = (value: unknown): value is Session => typeof value === 'object' &&
  value !== null &&
  'token' in value &&
  typeof value.token === 'string' &&
  'user' in value &&
  isPublicUser(value.user);

/**
 * Reads the exp claim without verifying the signature, only to avoid restoring a session the API would reject anyway.
 */
const isTokenExpired = (token: string): boolean => {
  try {
    const [, payload] = token.split('.', 2);
    if (payload === undefined) {
      return true;
    }

    const claims: unknown = JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/')));
    if (typeof claims !== 'object' || claims === null || !('exp' in claims) || typeof claims.exp !== 'number') {
      return false;
    }

    return claims.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

const readStoredSession = (): Nullable<Session> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      return null;
    }

    const parsed: unknown = JSON.parse(stored);
    return isSession(parsed) && !isTokenExpired(parsed.token) ? parsed : null;
  } catch {
    return null;
  }
};

const store: { session: Nullable<Session> } = { session: readStoredSession() };
const listeners = new Set<() => void>();

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const handleStorage = (event: StorageEvent): void => {
  // Keeps tabs in sync when another one logs in or out.
  if (event.key !== STORAGE_KEY) {
    return;
  }

  store.session = readStoredSession();
  notify();
};

export const getSession = (): Nullable<Session> => store.session;

export const subscribeToSession = (listener: () => void): () => void => {
  if (listeners.size === 0) {
    addEventListener('storage', handleStorage);
  }

  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      removeEventListener('storage', handleStorage);
    }
  };
};

export const setSession = (session: Nullable<Session>): void => {
  store.session = session;
  try {
    if (session === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // Storage can be unavailable (private mode); the session still applies for this tab.
  }

  notify();
};
