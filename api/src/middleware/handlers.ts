import { logger } from '@moonstar-x/logger';
import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ApiResponseError } from '../app/http/errors/ApiResponseError.js';
import { ErrorCodes } from '../app/http/errors/ErrorCodes.js';
import { InternalServerError } from '../app/http/errors/InternalServerError.js';
import { ResourceNotFoundError } from '../app/http/errors/ResourceNotFoundError.js';
import { ResponseBuilder } from '../app/http/ResponseBuilder.js';

type ErrorLike = Error & {
  toApiResponseError?: () => ApiResponseError;
};

export const resolveApiResponseError = (error: ErrorLike): ApiResponseError => {
  if (error instanceof ApiResponseError) {
    return error;
  }

  if (error.toApiResponseError) {
    return error.toApiResponseError();
  }

  return new InternalServerError(error.message);
};

export const handleExpressError = (error: Error, _req: Request, res: Response, next: NextFunction): void => {
  const apiResponseError = resolveApiResponseError(error);

  if (apiResponseError.status === StatusCodes.INTERNAL_SERVER_ERROR.valueOf()) {
    logger.error(error);
  }

  const response = new ResponseBuilder().withError(apiResponseError);
  res.status(response.statusCode).send(response.build());

  next();
};

export const handleRouteNotFound = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new ResourceNotFoundError('This route is not handled by the server.', ErrorCodes.NOT_FOUND));
};
