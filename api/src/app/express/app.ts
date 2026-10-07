import { fileURLToPath } from 'node:url';
import cors from 'cors';
import type { Express } from 'express';
import express from 'express';
import { PUBLIC_DIRECTORY } from '../../config/environment.js';
import { handleExpressError, handleRouteNotFound } from '../../middleware/handlers.js';
import { logRequests } from '../../middleware/logging.js';
import { ensurePublicDirectory, PUBLIC_ROUTE } from '../../services/outputs/storage.js';
import { AutoControllerRegistry } from '../registry/AutoControllerRegistry.js';

const CONTROLLERS_DIRECTORY = fileURLToPath(new URL('../../controllers', import.meta.url));

export const createApp = async (): Promise<Express> => {
  const app = express();
  app.use(cors());
  app.use(logRequests);

  app.options('*all', cors());

  const registry = await new AutoControllerRegistry(CONTROLLERS_DIRECTORY).load();
  app.use('/', registry.getRouter());

  await ensurePublicDirectory();
  app.use(PUBLIC_ROUTE, express.static(PUBLIC_DIRECTORY, { index: false }));

  app.all('*all', handleRouteNotFound);
  app.use(handleExpressError);

  return app;
};
