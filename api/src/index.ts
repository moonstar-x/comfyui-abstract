import path from 'node:path';
import process from 'node:process';
import { logger } from '@moonstar-x/logger';
import { createApp, listen } from './app/express/app.js';
import { registerShutdownHandlers } from './app/shutdown.js';
import { PORT } from './config/environment.js';
import { ComfyUiClientSession } from './services/comfyui/ComfyUiClientSession.js';
import { loadConfig } from './services/config/config.js';
import { loadDocumentation } from './services/config/documentation.js';
import { database } from './services/database/client/postgres.js';
import { runMigrationsForApp } from './services/database/migration/migration.js';
import { GenerationJobTracker } from './services/generations/GenerationJobTracker.js';
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

  // The tracker follows the session's events, so it has to be listening before the session connects.
  const comfyUi = ComfyUiClientSession.create();
  const jobTracker = new GenerationJobTracker(comfyUi);
  await jobTracker.start();

  // The ComfyUI session and the WebSocket heartbeat keep the process alive, so they only start once nothing else can fail.
  const httpServer = await listen(await createApp(), PORT);
  logger.info(`Server started on port ${PORT.toString()}`);

  const webSocketServer = WebSocketServer.create(httpServer, { comfyUi, jobTracker });
  registerShutdownHandlers({ httpServer, webSocketServer, comfyUi, jobTracker });
  comfyUi.start();
} catch (error) {
  logger.error(error);
  // Lets the process end on its own once the open handles close, so the logs above still get flushed.
  process.exitCode = 1;
  // Idle pool connections would otherwise hold the process open until they time out.
  await database.$pool.end();
}
