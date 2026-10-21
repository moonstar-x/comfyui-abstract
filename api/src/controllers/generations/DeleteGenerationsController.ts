import type { Request, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { DeleteController } from '../../app/controller/DeleteController.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { parseBody } from '../../app/http/validation.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedResponse } from '../../middleware/auth.js';
import { deleteGenerations } from '../../services/database/repositories/generations.js';
import { deleteGenerationOutputs, toHistoryGeneration } from '../../services/generations/history.js';
import { DeleteGenerationsBodySchema } from '../../services/generations/schemas.js';

/**
 * Deletes several generations of the current user at once along with their output files.
 * IDs that don't exist or belong to someone else are skipped, so the response only lists the generations that were deleted.
 */
export default class DeleteGenerationsController extends DeleteController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path = '/generations';

  public override async handle(req: Request, res: AuthenticatedResponse): Promise<ResponseBuilder> {
    const { username } = res.locals.user;
    const { ids } = parseBody(DeleteGenerationsBodySchema, req.body);

    const deletedGenerations = await deleteGenerations(ids, username);
    await Promise.all(deletedGenerations.map(async (generation) => {
      await deleteGenerationOutputs(generation);
    }));

    return new ResponseBuilder().withStatus(StatusCodes.OK).withData(deletedGenerations.map((generation) => toHistoryGeneration(generation)));
  }
}
