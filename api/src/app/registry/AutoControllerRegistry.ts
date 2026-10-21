import { pathToFileURL } from 'node:url';
import { glob } from 'glob';
import type { Controller } from '../controller/Controller.js';
import { ControllerRegistry } from './ControllerRegistry.js';

const isController = (value: unknown): value is Controller => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return 'handle' in value && typeof value.handle === 'function' &&
    'method' in value && typeof value.method === 'string' &&
    'path' in value && typeof value.path === 'string' &&
    'middleware' in value && Array.isArray(value.middleware);
};

export class AutoControllerRegistry extends ControllerRegistry {
  private readonly _directory: string;

  constructor(directory: string) {
    super();
    this._directory = directory;
  }

  public async load(): Promise<this> {
    const files = await glob('**/*.{ts,js}', {
      cwd: this._directory,
      absolute: true,
      ignore: '**/*.d.ts'
    });

    const sortedFiles = files.toSorted((a, b) => a.localeCompare(b));
    const entries = await Promise.all(sortedFiles.map(async (file) => {
      const module: unknown = await import(pathToFileURL(file).href);
      return { file, module };
    }));

    for (const { file, module } of entries) {
      if (typeof module !== 'object' || module === null || !('default' in module) || typeof module.default !== 'function') {
        throw new TypeError(`Controller file ${file} does not have a default export class.`);
      }

      const controller: unknown = Reflect.construct(module.default, []);
      if (!isController(controller)) {
        throw new TypeError(`Default export of ${file} is not a valid Controller.`);
      }

      this.register(controller);
    }

    return this;
  }
}
