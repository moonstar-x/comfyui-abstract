import path from 'node:path';
import type { Request, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { PostController } from '../../app/controller/PostController.js';
import { BadRequestError } from '../../app/http/errors/BadRequestError.js';
import { ResourceNotFoundError } from '../../app/http/errors/ResourceNotFoundError.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { requireAuth } from '../../middleware/auth.js';
import { findGenerationById } from '../../services/database/repositories/generations.js';
import { GenerationIdSchema, GenerationOutputIndexSchema } from '../../services/generations/schemas.js';
import { readFileFromPublic } from '../../services/outputs/storage.js';
import { isUploadKind, storeGenerationOutputInput, UPLOAD_KIND_CONFIGS } from '../../services/uploads/uploads.js';

/**
 * Stores an output file of a generation in the ComfyUI input directory, so it can be used as an input of another workflow.
 * The file isn't recorded as an upload of the current user. Generations are shared with every user, so any of them can be reused.
 * Responds with the reference that workflow params use to point at the file.
 */
export default class PostGenerationOutputInputController extends PostController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path = '/generations/:id/outputs/:index/input';

  public override async handle(req: Request): Promise<ResponseBuilder> {
    const { id, index } = req.params;

    const idResult = GenerationIdSchema.safeParse(id);
    const generation = idResult.success ? await findGenerationById(idResult.data) : null;
    if (!generation) {
      throw new ResourceNotFoundError(`Generation ${String(id)} does not exist.`);
    }

    const indexResult = GenerationOutputIndexSchema.safeParse(index);
    const output = indexResult.success ? generation.outputs[indexResult.data] : undefined;
    if (output === undefined || !indexResult.success) {
      throw new ResourceNotFoundError(`Generation ${generation.id} has no output ${String(index)}.`);
    }

    // Media types and upload kinds share their values, so the output must be a file workflows accept as an upload of the same kind.
    const kind = generation.media_type;
    const extension = path.extname(output).slice(1).toLowerCase();
    if (!isUploadKind(kind) || !Object.values(UPLOAD_KIND_CONFIGS[kind].extensions).includes(extension)) {
      throw new BadRequestError(`Output ${indexResult.data.toString()} of generation ${generation.id} is not a supported ${kind}.`);
    }

    const data = await readFileFromPublic(output);
    const reference = await storeGenerationOutputInput(generation.id, indexResult.data, extension, data);

    return new ResponseBuilder().withStatus(StatusCodes.CREATED).withData({ reference });
  }
}
