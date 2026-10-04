import { logger } from '@moonstar-x/logger';
import { createApp } from './app/express/app.js';
import { PORT } from './config/environment.js';
import { attachWebSocketServer } from './websocket/server.js';

try {
  const app = await createApp();
  const server = app.listen(PORT, (): void => {
    logger.info(`Server started on port ${PORT.toString()}`);
  });

  attachWebSocketServer(server);
} catch (error) {
  logger.error(error);
}
