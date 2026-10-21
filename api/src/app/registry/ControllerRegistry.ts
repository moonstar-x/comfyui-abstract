import { Buffer } from 'node:buffer';
import type { RequestHandler } from 'express';
import { Router } from 'express';
import type { Controller } from '../controller/Controller.js';
import { sendEventStream } from '../http/events.js';

const wrapController = (controller: Controller): RequestHandler => async (req, res) => {
  const response = await controller.handle(req, res);
  const { events, file } = response;
  if (events !== undefined) {
    await sendEventStream(res, response.statusCode, events);
    return;
  }

  if (file !== undefined) {
    res.status(response.statusCode).type(file.contentType).send(Buffer.from(file.data.buffer, file.data.byteOffset, file.data.byteLength));
    return;
  }

  res.status(response.statusCode).send(response.build());
};

export class ControllerRegistry {
  private readonly _controllers: Controller[];

  constructor() {
    this._controllers = [];
  }

  public getRouter(): Router {
    const router = Router();

    for (const controller of this._controllers) {
      router[controller.method](controller.path, ...controller.middleware, wrapController(controller));
    }

    return router;
  }

  public register(...controllers: Controller[]): this {
    this._controllers.push(...controllers);
    return this;
  }
}
