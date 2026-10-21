import { TextEncoder } from 'node:util';
import { jwtVerify, SignJWT } from 'jose';
import { JWT_EXPIRATION, JWT_SECRET } from '../../config/environment.js';

const ALGORITHM = 'HS256';
const VERSION_CLAIM = 'ver';
const secret = new TextEncoder().encode(JWT_SECRET);

export interface TokenPayload {
  username: string;
  /**
   * The token version of the user when the token was issued. The token is revoked once the user's version moves past it.
   */
  version: number;
}

export const signToken = async ({ username, version }: TokenPayload): Promise<string> => await new SignJWT({ [VERSION_CLAIM]: version })
  .setProtectedHeader({ alg: ALGORITHM })
  .setSubject(username)
  .setIssuedAt()
  .setExpirationTime(JWT_EXPIRATION)
  .sign(secret);

/**
 * Throws if the token is malformed, has an invalid signature or has expired. Whether it was revoked is up to the caller.
 */
export const verifyToken = async (token: string): Promise<TokenPayload> => {
  const { payload } = await jwtVerify(token, secret, { algorithms: [ALGORITHM] });
  if (typeof payload.sub !== 'string') {
    throw new TypeError('Token does not have a subject.');
  }

  const version = payload[VERSION_CLAIM];
  if (typeof version !== 'number') {
    throw new TypeError('Token does not have a version.');
  }

  return { username: payload.sub, version };
};
