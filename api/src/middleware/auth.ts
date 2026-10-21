import type { NextFunction, Request, Response } from 'express';
import { ErrorCodes } from '../app/http/errors/ErrorCodes.js';
import { UnauthorizedRequestError } from '../app/http/errors/UnauthorizedRequestError.js';
import { authenticateToken, InvalidSessionError } from '../services/auth/session.js';
import type { AuthenticatedUser } from '../services/auth/session.js';

const BEARER_PREFIX = 'Bearer ';

export type { AuthenticatedUser } from '../services/auth/session.js';

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
  try {
    return await authenticateToken(token);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      throw new UnauthorizedRequestError(error.message, ErrorCodes.SESSION_INVALID);
    }

    throw error;
  }
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
