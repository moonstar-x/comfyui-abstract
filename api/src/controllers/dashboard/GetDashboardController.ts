import type { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { GetController } from '../../app/controller/GetController.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  countGenerationsByPeriod,
  findMostActiveGenerationUserSummaries,
  toGenerationPeriodCounts,
  toGenerationUserSummary
} from '../../services/database/repositories/generations.js';
import { countUsers } from '../../services/database/repositories/users.js';

const MOST_ACTIVE_USERS_LIMIT = 10;

/**
 * General statistics about the whole application.
 */
export default class GetDashboardController extends GetController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path = '/dashboard';

  public override async handle(): Promise<ResponseBuilder> {
    const [userCount, generationCounts, mostActiveUsers] = await Promise.all([
      countUsers(),
      countGenerationsByPeriod(),
      findMostActiveGenerationUserSummaries(MOST_ACTIVE_USERS_LIMIT)
    ]);

    return new ResponseBuilder().withStatus(StatusCodes.OK).withData({
      users: { count: userCount },
      generations: toGenerationPeriodCounts(generationCounts),
      mostActiveUsers: mostActiveUsers.map((summary) => toGenerationUserSummary(summary))
    });
  }
}
