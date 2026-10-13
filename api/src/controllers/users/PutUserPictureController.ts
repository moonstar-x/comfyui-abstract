import type { Request, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { PutController } from '../../app/controller/PutController.js';
import { getMediaType, readRawBody } from '../../app/http/body.js';
import { ResourceNotFoundError } from '../../app/http/errors/ResourceNotFoundError.js';
import { UnsupportedMediaTypeError } from '../../app/http/errors/UnsupportedMediaTypeError.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedResponse } from '../../middleware/auth.js';
import { RESERVED_USERNAMES } from '../../services/auth/reserved.js';
import { findUserByUsername, toPublicUser, updateUser } from '../../services/database/repositories/users.js';
import { getUploadExtension, UPLOAD_KIND_CONFIGS, UPLOAD_KINDS } from '../../services/uploads/uploads.js';
import { deleteProfilePicture, saveProfilePicture } from '../../services/users/pictures.js';

/**
 * Replaces the profile picture of the current user with the image sent as the raw request body with its content type.
 * The image is stored in the public directory and the previous uploaded picture, if any, is deleted.
 */
export default class PutUserPictureController extends PutController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path: string = `/users/${RESERVED_USERNAMES.CURRENT_USER}/picture`;

  public override async handle(req: Request, res: AuthenticatedResponse): Promise<ResponseBuilder> {
    const { username } = res.locals.user;
    const config = UPLOAD_KIND_CONFIGS[UPLOAD_KINDS.IMAGE];

    const contentType = getMediaType(req);
    const extension = getUploadExtension(UPLOAD_KINDS.IMAGE, contentType);
    if (extension === undefined) {
      const accepted = Object.keys(config.extensions).join(', ');
      throw new UnsupportedMediaTypeError(`Content type ${contentType === '' ? '(none)' : contentType} is not a supported image. Supported types: ${accepted}.`);
    }

    const user = await findUserByUsername(username);
    if (!user) {
      throw new ResourceNotFoundError(`User ${username} does not exist.`);
    }

    const data = await readRawBody(req, config.maxBytes);
    const pictureUrl = await saveProfilePicture(username, data, extension);
    const updatedUser = await updateUser(username, { pictureUrl });
    await deleteProfilePicture(user.picture_url);

    return new ResponseBuilder().withStatus(StatusCodes.OK).withData(toPublicUser(updatedUser));
  }
}
