import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import type { Express, Request, Response } from 'express';
import express from 'express';
import { APP_BUILD_DIR, PUBLIC_DIRECTORY } from '../../config/environment.js';
import { handleExpressError, handleRouteNotFound } from '../../middleware/handlers.js';
import { logRequests } from '../../middleware/logging.js';
import { ensurePublicDirectory, PUBLIC_ROUTE } from '../../services/outputs/storage.js';
import { WEBSOCKET_PATH } from '../../websocket/WebSocketServer.js';
import { AutoControllerRegistry } from '../registry/AutoControllerRegistry.js';

const CONTROLLERS_DIRECTORY = fileURLToPath(new URL('../../controllers', import.meta.url));

const API_ROUTE = '/api';

/**
 * Serves the built UI, falling back to its index for any other GET so the UI handles routing, including its own 404 page.
 */
const serveApp = (app: Express, directory: string): void => {
  const index = path.join(directory, 'index.html');

  app.use(express.static(directory));
  app.get('*all', (_req: Request, res: Response): void => {
    res.sendFile(index);
  });
};

export const createApp = async (): Promise<Express> => {
  const app = express();
  app.use(cors());
  app.use(logRequests);
  app.use(express.json());

  app.options('*all', cors());

  // Unknown routes under these prefixes keep the JSON 404 instead of falling through to the UI.
  const registry = await new AutoControllerRegistry(CONTROLLERS_DIRECTORY).load();
  app.use(API_ROUTE, registry.getRouter(), handleRouteNotFound);

  await ensurePublicDirectory();
  app.use(PUBLIC_ROUTE, express.static(PUBLIC_DIRECTORY, { index: false }), handleRouteNotFound);

  app.use(WEBSOCKET_PATH, handleRouteNotFound);

  if (APP_BUILD_DIR !== null) {
    serveApp(app, APP_BUILD_DIR);
  }

  app.all('*all', handleRouteNotFound);
  app.use(handleExpressError);

  return app;
};
