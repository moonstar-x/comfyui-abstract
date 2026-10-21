interface AttemptWindow {
  count: number;
  resetAt: number;
}

export interface AttemptLimiterOptions {
  maxAttempts: number;
  windowMs: number;
}

/**
 * Counts attempts per key in fixed windows kept in memory, so the limits apply to this process only.
 * Checking and recording are synchronous, so concurrent requests can't all pass the check before any of them is recorded.
 */
export class AttemptLimiter {
  private readonly _maxAttempts: number;
  private _nextPruneAt: number;
  private readonly _windowMs: number;
  private readonly _windows: Map<string, AttemptWindow>;

  constructor({ maxAttempts, windowMs }: AttemptLimiterOptions) {
    this._maxAttempts = maxAttempts;
    this._windowMs = windowMs;
    this._windows = new Map();
    this._nextPruneAt = 0;
  }

  /**
   * Returns how many milliseconds are left until the key can make another attempt, or 0 if it can make one now.
   */
  public getRetryAfterMs(key: string, now: number = Date.now()): number {
    const window = this._windows.get(key);
    if (!window || window.resetAt <= now || window.count < this._maxAttempts) {
      return 0;
    }

    return window.resetAt - now;
  }

  public record(key: string, now: number = Date.now()): void {
    this.prune(now);

    const window = this._windows.get(key);
    if (!window || window.resetAt <= now) {
      this._windows.set(key, { count: 1, resetAt: now + this._windowMs });
      return;
    }

    window.count += 1;
  }

  public reset(key: string): void {
    this._windows.delete(key);
  }

  /**
   * Drops expired windows at most once per window length, so keys that are never seen again don't pile up.
   */
  private prune(now: number): void {
    if (now < this._nextPruneAt) {
      return;
    }

    for (const [key, window] of this._windows) {
      if (window.resetAt <= now) {
        this._windows.delete(key);
      }
    }

    this._nextPruneAt = now + this._windowMs;
  }
}
