import { StatusCodes } from 'http-status-codes';
import { GetController } from '../../app/controller/GetController.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';

export default class GetHealthController extends GetController {
  public readonly path = '/health';

  public override handle(): ResponseBuilder {
    return new ResponseBuilder().withStatus(StatusCodes.OK).withData({ status: 'OK' });
  }
}
