import { TextEncoder } from 'node:util';
import { jwtVerify, SignJWT } from 'jose';
import { JWT_EXPIRATION, JWT_SECRET } from '../../config/environment.js';

const ALGORITHM = 'HS256';
const secret = new TextEncoder().encode(JWT_SECRET);

export interface TokenPayload {
  username: string;
}

export const signToken = async ({ username }: TokenPayload): Promise<string> => await new SignJWT()
  .setProtectedHeader({ alg: ALGORITHM })
  .setSubject(username)
  .setIssuedAt()
  .setExpirationTime(JWT_EXPIRATION)
  .sign(secret);

/**
 * Throws if the token is malformed, has an invalid signature or has expired.
 */
export const verifyToken = async (token: string): Promise<TokenPayload> => {
  const { payload } = await jwtVerify(token, secret, { algorithms: [ALGORITHM] });
  if (typeof payload.sub !== 'string') {
    throw new TypeError('Token does not have a subject.');
  }

  return { username: payload.sub };
};
