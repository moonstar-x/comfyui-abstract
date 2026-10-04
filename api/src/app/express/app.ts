import cors from 'cors';
import type { Express } from 'express';
import express from 'express';
import { handleExpressError, handleRouteNotFound } from '../../middleware/handlers.js';
import { logRequests } from '../../middleware/logging.js';

export const createApp = async (): Promise<Express> => {
  const app = express();
  app.use(cors());
  app.use(logRequests);

  app.options('*all', cors());

  // app.use('/', await getApiRouter());

  app.all('*all', handleRouteNotFound);
  app.use(handleExpressError);

  return app;
};
