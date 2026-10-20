import path from 'node:path';
import { logger } from '@moonstar-x/logger';
import { createApp } from './app/express/app.js';
import { PORT } from './config/environment.js';
import { loadConfig } from './services/config/config.js';
import { loadDocumentation } from './services/config/documentation.js';
import { runMigrationsForApp } from './services/database/migration/migration.js';
import { warnIfLmStudioModelIsMissing } from './services/lmstudio/models.js';
import { WebSocketServer } from './websocket/WebSocketServer.js';
import { findUnusedDocumentation, validateWorkflowConfigs } from './workflows/factory.js';

try {
  const config = await loadConfig();
  validateWorkflowConfigs(config);

  const unusedDocumentation = findUnusedDocumentation(config, await loadDocumentation());
  if (unusedDocumentation.length > 0) {
    logger.warn(`Model instructions describe models that are not in the config: ${unusedDocumentation.join(', ')}.`);
  }

  // Not awaited, so a slow or unreachable LM Studio does not hold up the server.
  void warnIfLmStudioModelIsMissing(config.lmstudio.model);

  const migrationsDirectory = path.join(import.meta.dirname, '../migrations');
  await runMigrationsForApp(migrationsDirectory);

  const app = await createApp();
  const server = app.listen(PORT, (): void => {
    logger.info(`Server started on port ${PORT.toString()}`);
  });

  WebSocketServer.create(server);
} catch (error) {
  logger.error(error);
}
