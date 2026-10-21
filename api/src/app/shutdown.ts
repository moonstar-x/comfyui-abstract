import type { Server as HttpServer } from 'node:http';
import process from 'node:process';
import { logger } from '@moonstar-x/logger';
import { database } from '../services/database/client/postgres.js';
import type { WebSocketServer } from '../websocket/WebSocketServer.js';

// Docker sends SIGKILL 10 seconds after SIGTERM by default, so the shutdown has to be done before that.
const GRACE_PERIOD_MS = 7000;
const HARD_TIMEOUT_MS = 9000;
const SHUTDOWN_SIGNALS: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

export interface ShutdownTargets {
  httpServer: HttpServer;
  webSocketServer: WebSocketServer;
}

const exit = (code: number): never => {
  // A signal handler is the one place where the process has to end on its own, even with work still pending.
  // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
  process.exit(code);
};

const closeHttpServer = async (server: HttpServer): Promise<void> => {
  const { promise, resolve, reject } = Promise.withResolvers<undefined>();
  server.close((error) => {
    if (error) {
      reject(error);
      return;
    }

    resolve(undefined);
  });

  await promise;
};

/**
 * Stops accepting connections, gives in-flight requests and event streams the grace period to finish, and then closes
 * the database pool. Connections still open after the grace period are dropped.
 */
const shutDown = async ({ httpServer, webSocketServer }: ShutdownTargets): Promise<void> => {
  const graceTimer = setTimeout(() => {
    logger.warn('Open connections did not finish in time, dropping them.');
    webSocketServer.terminate();
    httpServer.closeAllConnections();
  }, GRACE_PERIOD_MS);

  try {
    webSocketServer.close();
    await closeHttpServer(httpServer);
  } finally {
    clearTimeout(graceTimer);
  }

  await database.$pool.end();
};

/**
 * Shuts the server down gracefully on SIGTERM (docker stop) and SIGINT (Ctrl+C).
 * A second signal exits immediately, and so does a shutdown that hangs past the hard timeout.
 */
export const registerShutdownHandlers = (targets: ShutdownTargets): void => {
  let isShuttingDown = false;

  const handleSignal = (signal: NodeJS.Signals): void => {
    if (isShuttingDown) {
      logger.warn(`Received ${signal} again, exiting immediately.`);
      exit(1);
    }

    isShuttingDown = true;
    logger.info(`Received ${signal}, shutting down.`);

    // Request handlers keep running after their connection is dropped and may hold database clients, which would stall the pool.
    setTimeout(() => {
      logger.error('Shutdown timed out, exiting.');
      exit(1);
    }, HARD_TIMEOUT_MS).unref();

    void (async (): Promise<void> => {
      try {
        await shutDown(targets);
        logger.info('Shutdown complete.');
        exit(0);
      } catch (error) {
        logger.error('Could not shut down cleanly.', error);
        exit(1);
      }
    })();
  };

  for (const signal of SHUTDOWN_SIGNALS) {
    process.on(signal, handleSignal);
  }
};
