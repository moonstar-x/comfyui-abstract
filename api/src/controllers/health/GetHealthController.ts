import { StatusCodes } from 'http-status-codes';
import { GetController } from '../../app/controller/GetController.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { pingComfyUi } from '../../services/comfyui/client.js';
import { pingDatabase } from '../../services/database/client/postgres.js';

// Kept below the Dockerfile's HEALTHCHECK timeout so an unreachable dependency is reported as down instead of timing out the check.
const CHECK_TIMEOUT_MS = 3000;

type ServiceStatus = 'down' | 'up';

/**
 * Runs the check, reporting it as down if it fails or takes too long. A database query cannot be aborted, so it is raced
 * against the timeout instead and left to settle in the background.
 */
const getServiceStatus = async (check: (signal: AbortSignal) => Promise<void>): Promise<ServiceStatus> => {
  const signal = AbortSignal.timeout(CHECK_TIMEOUT_MS);
  const timeout = Promise.withResolvers<never>();
  signal.addEventListener('abort', () => {
    timeout.reject(signal.reason);
  }, { once: true });

  try {
    await Promise.race([check(signal), timeout.promise]);
    return 'up';
  } catch {
    return 'down';
  }
};

/**
 * Reports whether the API and the services it depends on are reachable, answering 503 if any of them is down.
 */
export default class GetHealthController extends GetController {
  public readonly path = '/health';

  public override async handle(): Promise<ResponseBuilder> {
    const [comfyUi, database] = await Promise.all([
      getServiceStatus(pingComfyUi),
      getServiceStatus(pingDatabase)
    ]);

    const isHealthy = comfyUi === 'up' && database === 'up';
    return new ResponseBuilder()
      .withStatus(isHealthy ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE)
      .withData({ api: 'up', comfyUi, database });
  }
}
