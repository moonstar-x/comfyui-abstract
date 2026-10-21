import { findUserByUsername } from '../database/repositories/users.js';
import { verifyToken } from './token.js';

/**
 * Identifies the user who made the request. Load the full user from the database when more is needed.
 */
export interface AuthenticatedUser {
  username: string;
}

export class InvalidSessionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InvalidSessionError';
  }
}

/**
 * Throws an InvalidSessionError if the token is invalid or has expired, its user no longer exists, or it was revoked
 * by a password change.
 */
export const authenticateToken = async (token: string): Promise<AuthenticatedUser> => {
  let username: string;
  let version: number;
  try {
    ({ username, version } = await verifyToken(token));
  } catch (error) {
    throw new InvalidSessionError('The provided token is invalid or has expired.', { cause: error });
  }

  const user = await findUserByUsername(username);
  if (!user) {
    throw new InvalidSessionError('The user for this token no longer exists.');
  }

  if (user.token_version !== version) {
    throw new InvalidSessionError('The provided token was revoked. Log in again.');
  }

  return { username: user.username };
};
