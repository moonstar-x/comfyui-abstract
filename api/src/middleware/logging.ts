import { logger } from '@moonstar-x/logger';
import type { NextFunction, Request, Response } from 'express';
import onFinished from 'on-finished';

export const logRequests = (req: Request, res: Response, next: NextFunction): void => {
  onFinished(res, (_, finalRes) => {
    const message = `${req.method}:${req.originalUrl} ${finalRes.statusCode.toString()} (${req.ip ?? 'N/A'})`;

    if (finalRes.statusCode < 400) {
      return logger.info(message);
    }

    if (finalRes.statusCode < 500) {
      return logger.warn(message);
    }

    return logger.error(message);
  });

  next();
};
