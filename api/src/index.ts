import { logger } from '@moonstar-x/logger';
import { createApp } from './app/express/app.js';
import { PORT } from './config/environment.js';
import { WebSocketServer } from './websocket/WebSocketServer.js';

try {
  const app = await createApp();
  const server = app.listen(PORT, (): void => {
    logger.info(`Server started on port ${PORT.toString()}`);
  });

  WebSocketServer.create(server);
} catch (error) {
  logger.error(error);
}
