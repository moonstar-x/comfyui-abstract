import type { Server as HttpServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import type { Express, Request, Response } from 'express';
import express from 'express';
import helmet from 'helmet';
import { APP_BUILD_DIR, CORS_ORIGINS, PUBLIC_DIRECTORY, TRUST_PROXY } from '../../config/environment.js';
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
  app.set('trust proxy', TRUST_PROXY);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        // Uploads are previewed from object URLs.
        'img-src': ["'self'", 'data:', 'blob:'],
        'media-src': ["'self'", 'blob:'],
        // Self-hosted instances are often reached over plain HTTP, where upgrading every request to HTTPS breaks the UI.
        'upgrade-insecure-requests': null
      }
    },
    // Outputs and profile pictures must stay embeddable by the allowed origins.
    crossOriginResourcePolicy: { policy: CORS_ORIGINS.length > 0 ? 'cross-origin' : 'same-origin' }
  }));

  // The UI served from here is same-origin, so CORS is only enabled for the origins configured to call the API from elsewhere.
  if (CORS_ORIGINS.length > 0) {
    app.use(cors({ origin: CORS_ORIGINS }));
  }

  app.use(logRequests);
  app.use(express.json());

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

/**
 * Starts the server on the given port, rejecting if it cannot be bound, such as when the port is already in use.
 */
export const listen = async (app: Express, port: number): Promise<HttpServer> => {
  const { promise, resolve, reject } = Promise.withResolvers<HttpServer>();
  const server = app.listen(port, (error) => {
    if (error) {
      reject(error);
      return;
    }

    resolve(server);
  });

  return await promise;
};
