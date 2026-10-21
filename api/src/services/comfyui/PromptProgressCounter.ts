import type { Nullable } from '../../utils/types.js';
import type { NodeProgress, PromptProgress } from './ComfyUiClientSession.js';

/**
 * Counts the progress of a prompt from its execution events, out of the number of nodes in it. Cached nodes count as completed.
 */
export class PromptProgressCounter {
  private readonly _completed = new Set<string>();
  private _current: Nullable<string> = null;
  private _hasProgress = false;
  private _step: Nullable<NodeProgress> = null;
  private readonly _total: number;

  constructor(total: number) {
    this._total = total;
  }

  /**
   * Null until any event is counted.
   */
  public get progress(): Nullable<PromptProgress> {
    if (!this._hasProgress) {
      return null;
    }

    return { completed: Math.min(this._completed.size, this._total), step: this._step, total: this._total };
  }

  public addCached(nodes: readonly string[]): void {
    for (const node of nodes) {
      this._completed.add(node);
    }
    this._hasProgress = true;
  }

  /**
   * ComfyUI runs one node at a time, so a node starting means the previous one finished. A null node means the prompt is done.
   */
  public setExecuting(node: Nullable<string>): void {
    if (this._current !== null) {
      this._completed.add(this._current);
    }
    this._current = node;
    this._step = null;
    this._hasProgress = true;
  }

  public setStep(step: NodeProgress): void {
    this._step = step;
    this._hasProgress = true;
  }
}
