import type { Request, RequestHandler, Response } from 'express';
import type { ResponseBuilder } from '../http/ResponseBuilder.js';
import type { Controller } from './Controller.js';

export abstract class GetController implements Controller {
  public readonly method = 'get';
  public readonly middleware: RequestHandler[] = [];
  public abstract readonly path: string;

  public abstract handle(req: Request, res: Response): Promise<ResponseBuilder> | ResponseBuilder;
}
