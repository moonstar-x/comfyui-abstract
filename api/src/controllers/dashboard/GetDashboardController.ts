import type { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { GetController } from '../../app/controller/GetController.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  countGenerationsByDay,
  countGenerationsByPeriod,
  countGenerationsByWorkflow,
  findMostActiveGenerationUserSummaries,
  findTopGenerationModels,
  getGenerationTimingStats,
  toGenerationDailyCount,
  toGenerationModelCount,
  toGenerationPeriodCounts,
  toGenerationTimingStats,
  toGenerationUserSummary,
  toGenerationWorkflowCount
} from '../../services/database/repositories/generations.js';
import { countUsers } from '../../services/database/repositories/users.js';

const MOST_ACTIVE_USERS_LIMIT = 10;
const TOP_MODELS_LIMIT = 5;
const ACTIVITY_DAYS = 30;

/**
 * General statistics about the whole application.
 */
export default class GetDashboardController extends GetController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path = '/dashboard';

  public override async handle(): Promise<ResponseBuilder> {
    const [userCount, generationCounts, mostActiveUsers, workflowCounts, topModels, dailyCounts, timingStats] = await Promise.all([
      countUsers(),
      countGenerationsByPeriod(),
      findMostActiveGenerationUserSummaries(MOST_ACTIVE_USERS_LIMIT),
      countGenerationsByWorkflow(),
      findTopGenerationModels(TOP_MODELS_LIMIT),
      countGenerationsByDay(ACTIVITY_DAYS),
      getGenerationTimingStats()
    ]);

    return new ResponseBuilder().withStatus(StatusCodes.OK).withData({
      users: { count: userCount },
      generations: toGenerationPeriodCounts(generationCounts),
      mostActiveUsers: mostActiveUsers.map((summary) => toGenerationUserSummary(summary)),
      workflows: workflowCounts.map((count) => toGenerationWorkflowCount(count)),
      topModels: topModels.map((count) => toGenerationModelCount(count)),
      dailyActivity: dailyCounts.map((count) => toGenerationDailyCount(count)),
      timing: toGenerationTimingStats(timingStats)
    });
  }
}
