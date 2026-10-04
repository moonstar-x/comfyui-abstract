import { GetController } from '../app/controller/GetController.js';
import { ResponseBuilder } from '../app/http/ResponseBuilder.js';

export class GetHealthController extends GetController {
  public readonly path = '/health';

  public override handle(): ResponseBuilder {
    return new ResponseBuilder().withData({ status: 'ok' });
  }
}
