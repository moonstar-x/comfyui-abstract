import type { Request, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { GetController } from '../../app/controller/GetController.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { parseQuery } from '../../app/http/validation.js';
import { requireAuth } from '../../middleware/auth.js';
import { findGenerationUserSummaries, toGenerationUserSummary } from '../../services/database/repositories/generations.js';
import { GenerationSummariesQuerySchema } from '../../services/generations/schemas.js';

/**
 * How many generations each user has made, most recently active user first.
 */
export default class GetGenerationUsersController extends GetController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path = '/generations/users';

  public override async handle(req: Request): Promise<ResponseBuilder> {
    const { mediaType } = parseQuery(GenerationSummariesQuerySchema, req.query);
    const summaries = await findGenerationUserSummaries(mediaType);

    return new ResponseBuilder().withStatus(StatusCodes.OK).withData(summaries.map((summary) => toGenerationUserSummary(summary)));
  }
}
