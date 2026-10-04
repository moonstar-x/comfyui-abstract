import type { RequestHandler } from 'express';
import { Router } from 'express';
import type { Controller } from '../controller/Controller.js';

const wrapController = (controller: Controller): RequestHandler => async (req, res) => {
  const response = await controller.handle(req, res);
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
