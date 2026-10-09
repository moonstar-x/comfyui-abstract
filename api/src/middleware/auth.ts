import type { NextFunction, Request, Response } from 'express';
import { ErrorCodes } from '../app/http/errors/ErrorCodes.js';
import { UnauthorizedRequestError } from '../app/http/errors/UnauthorizedRequestError.js';
import { verifyToken } from '../services/auth/token.js';
import { findUserByUsername } from '../services/database/repositories/users.js';

const BEARER_PREFIX = 'Bearer ';

/**
 * Identifies the user who made the request. Load the full user from the database when more is needed.
 */
export interface AuthenticatedUser {
  username: string;
}

export interface AuthenticatedLocals {
  user: AuthenticatedUser;
}

/**
 * Response type for controllers behind requireAuth, which guarantees res.locals.user is set.
 */
export type AuthenticatedResponse = Response<unknown, AuthenticatedLocals>;

const getBearerToken = (req: Request): null | string => {
  const header = req.headers.authorization;
  if (header?.startsWith(BEARER_PREFIX) !== true) {
    return null;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();
  return token === '' ? null : token;
};

const authenticate = async (token: string): Promise<AuthenticatedUser> => {
  let username: string;
  try {
    ({ username } = await verifyToken(token));
  } catch {
    throw new UnauthorizedRequestError('The provided token is invalid or has expired.', ErrorCodes.SESSION_INVALID);
  }

  const user = await findUserByUsername(username);
  if (!user) {
    throw new UnauthorizedRequestError('The user for this token no longer exists.', ErrorCodes.SESSION_INVALID);
  }

  return { username: user.username };
};

/**
 * Rejects the request unless it carries a valid JWT in the Authorization header. Sets res.locals.user on success.
 */
export const requireAuth = async (req: Request, res: Response<unknown, Partial<AuthenticatedLocals>>, next: NextFunction): Promise<void> => {
  const token = getBearerToken(req);
  if (token === null) {
    throw new UnauthorizedRequestError('No authorization token was provided.', ErrorCodes.SESSION_NOT_PROVIDED);
  }

  // eslint-disable-next-line no-param-reassign
  res.locals.user = await authenticate(token);
  next();
};
