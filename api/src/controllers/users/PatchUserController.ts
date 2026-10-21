import type { Request, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { PatchController } from '../../app/controller/PatchController.js';
import { ResourceNotFoundError } from '../../app/http/errors/ResourceNotFoundError.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { parseBody } from '../../app/http/validation.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedResponse } from '../../middleware/auth.js';
import { RESERVED_USERNAMES } from '../../services/auth/reserved.js';
import { findUserByUsername, toPublicUser, updateUser } from '../../services/database/repositories/users.js';
import { deleteProfilePicture } from '../../services/users/pictures.js';

// The password is changed through /users/me/password, which issues a new token.
// Pictures are only set by uploading to /users/me/picture, so other users' browsers never load an arbitrary URL.
const UpdateUserBodySchema = z.object({
  pictureUrl: z.null()
});

export default class PatchUserController extends PatchController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path: string = `/users/${RESERVED_USERNAMES.CURRENT_USER}`;

  public override async handle(req: Request, res: AuthenticatedResponse): Promise<ResponseBuilder> {
    const { username } = res.locals.user;
    const body = parseBody(UpdateUserBodySchema, req.body);

    const user = await findUserByUsername(username);
    if (!user) {
      throw new ResourceNotFoundError(`User ${username} does not exist.`);
    }

    const updatedUser = await updateUser(username, { pictureUrl: body.pictureUrl });
    if (updatedUser.picture_url !== user.picture_url) {
      // A picture uploaded through /users/me/picture is no longer used once it is replaced or removed.
      await deleteProfilePicture(user.picture_url);
    }

    return new ResponseBuilder().withStatus(StatusCodes.OK).withData(toPublicUser(updatedUser));
  }
}
