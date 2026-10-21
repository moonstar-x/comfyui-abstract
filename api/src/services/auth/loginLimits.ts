import { ErrorCodes } from '../../app/http/errors/ErrorCodes.js';
import { TooManyRequestsError } from '../../app/http/errors/TooManyRequestsError.js';
import { AttemptLimiter } from './AttemptLimiter.js';

const WINDOW_MS = 15 * 60 * 1000;

// Every attempt counts, not just failures, so a burst of parallel guesses is cut off before the passwords are checked.
const ipLimiter = new AttemptLimiter({ maxAttempts: 20, windowMs: WINDOW_MS });
const usernameLimiter = new AttemptLimiter({ maxAttempts: 10, windowMs: WINDOW_MS });

const getUsernameKey = (username: string): string => username.toLowerCase();

/**
 * Records a login attempt from this IP for this username. Throws without recording it if either has made too many attempts.
 */
export const consumeLoginAttempt = (ip: string, username: string): void => {
  const usernameKey = getUsernameKey(username);
  const retryAfterMs = Math.max(ipLimiter.getRetryAfterMs(ip), usernameLimiter.getRetryAfterMs(usernameKey));
  if (retryAfterMs > 0) {
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    const retryAfterMinutes = Math.ceil(retryAfterSeconds / 60);
    throw new TooManyRequestsError(
      `Too many login attempts. Try again in ${retryAfterMinutes.toString()} minute${retryAfterMinutes === 1 ? '' : 's'}.`,
      retryAfterSeconds,
      ErrorCodes.TOO_MANY_LOGIN_ATTEMPTS
    );
  }

  ipLimiter.record(ip);
  usernameLimiter.record(usernameKey);
};

/**
 * Clears the failed attempts for this username after a successful login. The IP keeps its count.
 */
export const clearLoginAttempts = (username: string): void => {
  usernameLimiter.reset(getUsernameKey(username));
};
