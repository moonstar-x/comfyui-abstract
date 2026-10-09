import type { Request } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { PostController } from '../../app/controller/PostController.js';
import { BadRequestError } from '../../app/http/errors/BadRequestError.js';
import { ConflictError } from '../../app/http/errors/ConflictError.js';
import { ErrorCodes } from '../../app/http/errors/ErrorCodes.js';
import { ForbiddenError } from '../../app/http/errors/ForbiddenError.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { parseBody } from '../../app/http/validation.js';
import { IS_SIGNUP_ENABLED } from '../../config/environment.js';
import { hashPassword } from '../../services/auth/password.js';
import { isUsernameReserved } from '../../services/auth/reserved.js';
import { PasswordSchema, PictureUrlSchema, UsernameSchema } from '../../services/auth/schemas.js';
import { POSTGRES_ERROR_CODES } from '../../services/database/client/codes.js';
import { createUser, toPublicUser } from '../../services/database/repositories/users.js';

const CreateUserBodySchema = z.object({
  username: UsernameSchema,
  password: PasswordSchema,
  pictureUrl: PictureUrlSchema.optional()
});

const isAlreadyExistsError = (error: unknown): boolean => typeof error === 'object' && error !== null &&
  'code' in error && error.code === POSTGRES_ERROR_CODES.ALREADY_EXISTS;

export default class PostUserController extends PostController {
  public readonly path = '/users';

  public override async handle(req: Request): Promise<ResponseBuilder> {
    if (!IS_SIGNUP_ENABLED) {
      throw new ForbiddenError('Signing up is disabled on this server.', ErrorCodes.SIGNUP_DISABLED);
    }

    const { username, password, pictureUrl } = parseBody(CreateUserBodySchema, req.body);
    if (isUsernameReserved(username)) {
      throw new BadRequestError(`The username ${username} is reserved.`, ErrorCodes.USERNAME_RESERVED);
    }

    try {
      const user = await createUser({
        username,
        passwordHash: await hashPassword(password),
        pictureUrl: pictureUrl ?? null
      });

      return new ResponseBuilder().withStatus(StatusCodes.CREATED).withData(toPublicUser(user));
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        throw new ConflictError(`User ${username} already exists.`, ErrorCodes.USER_ALREADY_EXISTS);
      }

      throw error;
    }
  }
}
