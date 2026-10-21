import type { Request } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { PostController } from '../../app/controller/PostController.js';
import { ErrorCodes } from '../../app/http/errors/ErrorCodes.js';
import { UnauthorizedRequestError } from '../../app/http/errors/UnauthorizedRequestError.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { parseBody } from '../../app/http/validation.js';
import { clearLoginAttempts, consumeLoginAttempt } from '../../services/auth/loginLimits.js';
import { isPasswordValid } from '../../services/auth/password.js';
import { signToken } from '../../services/auth/token.js';
import { findUserByUsername, toPublicUser } from '../../services/database/repositories/users.js';

const LoginBodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export default class PostLoginController extends PostController {
  public readonly path = '/auth/login';

  public override async handle(req: Request): Promise<ResponseBuilder> {
    const { username, password } = parseBody(LoginBodySchema, req.body);
    consumeLoginAttempt(req.ip ?? 'unknown', username);

    const user = await findUserByUsername(username);
    if (!user || !await isPasswordValid(user.password_hash, password)) {
      throw new UnauthorizedRequestError('Invalid username or password.', ErrorCodes.INVALID_CREDENTIALS);
    }

    clearLoginAttempts(username);
    const token = await signToken({ username: user.username, version: user.token_version });
    return new ResponseBuilder().withStatus(StatusCodes.OK).withData({ token, user: toPublicUser(user) });
  }
}
