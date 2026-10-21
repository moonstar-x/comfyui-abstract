import type { Request, RequestHandler } from 'express';
import { GetController } from '../../app/controller/GetController.js';
import type { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { parseQuery } from '../../app/http/validation.js';
import { requireAuth } from '../../middleware/auth.js';
import { respondWithGenerationsPage } from '../../services/generations/history.js';
import { GenerationsQuerySchema } from '../../services/generations/schemas.js';

/**
 * Generations of every user, newest first.
 */
export default class GetGenerationsController extends GetController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path = '/generations';

  public override async handle(req: Request): Promise<ResponseBuilder> {
    const query = parseQuery(GenerationsQuerySchema, req.query);
    return await respondWithGenerationsPage(query);
  }
}
