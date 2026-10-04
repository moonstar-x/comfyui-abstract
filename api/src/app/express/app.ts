import cors from 'cors';
import type { Express } from 'express';
import express from 'express';
import { GetHealthController } from '../../controllers/GetHealthController.js';
import { handleExpressError, handleRouteNotFound } from '../../middleware/handlers.js';
import { logRequests } from '../../middleware/logging.js';
import { ControllerRegistry } from './ControllerRegistry.js';

export const createApp = (): Express => {
  const app = express();
  app.use(cors());
  app.use(logRequests);

  app.options('*all', cors());

  const registry = new ControllerRegistry()
    .register(new GetHealthController());
  app.use('/', registry.getRouter());

  app.all('*all', handleRouteNotFound);
  app.use(handleExpressError);

  return app;
};
