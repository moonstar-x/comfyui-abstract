import type { Request, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { PatchController } from '../../app/controller/PatchController.js';
import { ErrorCodes } from '../../app/http/errors/ErrorCodes.js';
import { ResourceNotFoundError } from '../../app/http/errors/ResourceNotFoundError.js';
import { UnauthorizedRequestError } from '../../app/http/errors/UnauthorizedRequestError.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { parseBody } from '../../app/http/validation.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedResponse } from '../../middleware/auth.js';
import { hashPassword, isPasswordValid } from '../../services/auth/password.js';
import { RESERVED_USERNAMES } from '../../services/auth/reserved.js';
import { PasswordSchema, PictureUrlSchema } from '../../services/auth/schemas.js';
import { findUserByUsername, toPublicUser, updateUser } from '../../services/database/repositories/users.js';
import type { UpdateUserData } from '../../services/database/repositories/users.js';

const UpdateUserBodySchema = z.object({
  password: PasswordSchema.optional(),
  currentPassword: z.string().optional(),
  pictureUrl: PictureUrlSchema.optional()
})
  .refine((body) => body.password !== undefined || body.pictureUrl !== undefined, {
    message: 'At least one field must be provided.'
  })
  .refine((body) => body.password === undefined || body.currentPassword !== undefined, {
    message: 'currentPassword is required to change the password.',
    path: ['currentPassword']
  });

export default class PatchUserController extends PatchController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path: string = `/users/${RESERVED_USERNAMES.CURRENT_USER}`;

  public override async handle(req: Request, res: AuthenticatedResponse): Promise<ResponseBuilder> {
    const { username } = res.locals.user;
    const body = parseBody(UpdateUserBodySchema, req.body);

    const data: UpdateUserData = {};

    if (body.password !== undefined) {
      const user = await findUserByUsername(username);
      if (!user) {
        throw new ResourceNotFoundError(`User ${username} does not exist.`);
      }

      if (!await isPasswordValid(user.password_hash, body.currentPassword ?? '')) {
        throw new UnauthorizedRequestError('The current password is incorrect.', ErrorCodes.INVALID_CREDENTIALS);
      }

      data.passwordHash = await hashPassword(body.password);
    }

    if (body.pictureUrl !== undefined) {
      data.pictureUrl = body.pictureUrl;
    }

    const updatedUser = await updateUser(username, data);
    return new ResponseBuilder().withStatus(StatusCodes.OK).withData(toPublicUser(updatedUser));
  }
}
