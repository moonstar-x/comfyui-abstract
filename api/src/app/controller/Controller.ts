import type { Request, RequestHandler, Response } from 'express';
import type { ResponseBuilder } from '../http/ResponseBuilder.js';

export type HttpMethod = 'delete' | 'get' | 'patch' | 'post' | 'put';

export interface Controller {
  handle: (req: Request, res: Response) => Promise<ResponseBuilder> | ResponseBuilder;
  readonly method: HttpMethod;
  readonly middleware: RequestHandler[];
  readonly path: string;
}
