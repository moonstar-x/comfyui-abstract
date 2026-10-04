import { logger } from '@moonstar-x/logger';
import { createApp } from './app/express/app.js';
import { PORT } from './config/environment.js';

try {
  const app = await createApp();
  app.listen(PORT, (): void => {
    logger.info(`Server started on port ${PORT.toString()}`);
  });
} catch (error) {
  logger.error(error);
}
