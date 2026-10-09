import { apiRequest } from '@services/api/client';
import { isSession } from '@services/auth/session';
import type { Session } from '@services/auth/session';

export interface Credentials {
  password: string;
  username: string;
}

export const login = async (credentials: Credentials): Promise<Session> => {
  const data = await apiRequest('/auth/login', { method: 'POST', body: credentials });
  if (!isSession(data)) {
    throw new Error('The server returned an unexpected login response.');
  }

  return data;
};

export const createUser = async (credentials: Credentials): Promise<void> => {
  await apiRequest('/users', { method: 'POST', body: credentials });
};
