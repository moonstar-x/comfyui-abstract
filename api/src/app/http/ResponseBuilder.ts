import { StatusCodes } from 'http-status-codes';
import type { ApiResponseError } from './errors/ApiResponseError.js';

export type ResponseData = boolean | null | number | object | string;
export type ResponseMeta = Record<string, unknown>;

/**
 * A raw file sent as the response body instead of the JSON envelope.
 */
export interface ResponseFile {
  contentType: string;
  data: Uint8Array;
}

export class ResponseBuilder {
  private _data: ResponseData | undefined;
  private _error: object | undefined;
  private _file: ResponseFile | undefined;
  private _meta: ResponseMeta | undefined;
  private _status: number;

  constructor() {
    this._status = StatusCodes.OK;
    this._data = undefined;
    this._error = undefined;
    this._file = undefined;
    this._meta = {};
  }

  public get file(): ResponseFile | undefined {
    return this._file;
  }

  public get statusCode(): number {
    return this._status;
  }

  public build(): object {
    if (this._error !== undefined) {
      return {
        error: this._error,
        meta: this._meta
      };
    }

    return {
      data: this._data === undefined ? null : this._data,
      meta: this._meta
    };
  }

  public withData(data: ResponseData): this {
    if (this._error !== undefined) {
      throw new Error('Body already has error.');
    }

    this._data = data;
    return this;
  }

  public withError(error: ApiResponseError): this {
    if (this._data !== undefined) {
      throw new Error('Body already has data.');
    }

    this._error = error.getResponsePayload();
    return this.withStatus(error.status);
  }

  public withFile(file: ResponseFile): this {
    if (this._data !== undefined || this._error !== undefined) {
      throw new Error('Body already has data or error.');
    }

    this._file = file;
    return this;
  }

  public withMeta(meta: ResponseMeta): this {
    this._meta = meta;
    return this;
  }

  public withStatus(status: number): this {
    this._status = status;
    return this;
  }
}
