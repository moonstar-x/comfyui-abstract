import type { Request, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { PutController } from '../../app/controller/PutController.js';
import { ErrorCodes } from '../../app/http/errors/ErrorCodes.js';
import { ResourceNotFoundError } from '../../app/http/errors/ResourceNotFoundError.js';
import { UnauthorizedRequestError } from '../../app/http/errors/UnauthorizedRequestError.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { parseBody } from '../../app/http/validation.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedResponse } from '../../middleware/auth.js';
import { hashPassword, isPasswordValid } from '../../services/auth/password.js';
import { RESERVED_USERNAMES } from '../../services/auth/reserved.js';
import { PasswordSchema } from '../../services/auth/schemas.js';
import { signToken } from '../../services/auth/token.js';
import { findUserByUsername, toPublicUser, updateUser } from '../../services/database/repositories/users.js';

const ChangePasswordBodySchema = z.object({
  currentPassword: z.string().min(1),
  password: PasswordSchema
});

/**
 * Changes the password of the current user, which revokes every token issued before. Responds like a login with a new token,
 * so the session that changed the password stays logged in while every other one is logged out.
 */
export default class PutUserPasswordController extends PutController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path: string = `/users/${RESERVED_USERNAMES.CURRENT_USER}/password`;

  public override async handle(req: Request, res: AuthenticatedResponse): Promise<ResponseBuilder> {
    const { username } = res.locals.user;
    const { currentPassword, password } = parseBody(ChangePasswordBodySchema, req.body);

    const user = await findUserByUsername(username);
    if (!user) {
      throw new ResourceNotFoundError(`User ${username} does not exist.`);
    }

    if (!await isPasswordValid(user.password_hash, currentPassword)) {
      throw new UnauthorizedRequestError('The current password is incorrect.', ErrorCodes.INVALID_CREDENTIALS);
    }

    const updatedUser = await updateUser(username, { passwordHash: await hashPassword(password) });
    const token = await signToken({ username: updatedUser.username, version: updatedUser.token_version });
    return new ResponseBuilder().withStatus(StatusCodes.OK).withData({ token, user: toPublicUser(updatedUser) });
  }
}
