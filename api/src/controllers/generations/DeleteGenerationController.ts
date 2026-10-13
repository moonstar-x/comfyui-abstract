import type { Request, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { DeleteController } from '../../app/controller/DeleteController.js';
import { ForbiddenError } from '../../app/http/errors/ForbiddenError.js';
import { ResourceNotFoundError } from '../../app/http/errors/ResourceNotFoundError.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedResponse } from '../../middleware/auth.js';
import { deleteGeneration, findGenerationById, toPublicGeneration } from '../../services/database/repositories/generations.js';
import { deleteGenerationOutputs } from '../../services/generations/history.js';
import { GenerationIdSchema } from '../../services/generations/schemas.js';

/**
 * Deletes a generation of the current user along with its output files.
 */
export default class DeleteGenerationController extends DeleteController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path = '/generations/:id';

  public override async handle(req: Request, res: AuthenticatedResponse): Promise<ResponseBuilder> {
    const { username } = res.locals.user;
    const { id } = req.params;

    const result = GenerationIdSchema.safeParse(id);
    const generation = result.success ? await findGenerationById(result.data) : null;
    if (!generation) {
      throw new ResourceNotFoundError(`Generation ${String(id)} does not exist.`);
    }

    if (generation.username !== username) {
      throw new ForbiddenError('You can only delete your own generations.');
    }

    const deletedGeneration = await deleteGeneration(generation.id, username);
    if (!deletedGeneration) {
      throw new ResourceNotFoundError(`Generation ${generation.id} does not exist.`);
    }

    await deleteGenerationOutputs(deletedGeneration);
    return new ResponseBuilder().withStatus(StatusCodes.OK).withData(toPublicGeneration(deletedGeneration));
  }
}
