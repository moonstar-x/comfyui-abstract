import type { Request } from 'express';
import { StatusCodes } from 'http-status-codes';
import { GetController } from '../../app/controller/GetController.js';
import { ResourceNotFoundError } from '../../app/http/errors/ResourceNotFoundError.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { getWorkflowDefinition } from '../../workflows/factory.js';
import { WORKFLOW_TYPES } from '../../workflows/types.js';
import type { WorkflowType } from '../../workflows/types.js';

const WORKFLOW_TYPE_VALUES: readonly string[] = Object.values(WORKFLOW_TYPES);
const isWorkflowType = (value: unknown): value is WorkflowType => typeof value === 'string' && WORKFLOW_TYPE_VALUES.includes(value);

export default class GetWorkflowController extends GetController {
  public readonly path = '/workflows/:type';

  public override handle(req: Request): ResponseBuilder {
    const { type } = req.params;
    if (!isWorkflowType(type)) {
      throw new ResourceNotFoundError(`There is no workflow of type ${String(type)}.`);
    }

    return new ResponseBuilder().withStatus(StatusCodes.OK).withData(getWorkflowDefinition(type));
  }
}
