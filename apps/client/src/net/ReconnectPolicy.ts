/**
 * Exponential backoff with full jitter, capped at `maxMs`. The policy is
 * stateful: call `nextDelay()` after every failed connect, and `reset()`
 * after a successful connection to restore the initial delay.
 *
 * Jitter is "full jitter" as described by AWS:
 *   sleep = random(0, min(cap, base * 2^attempt))
 */
export interface ReconnectPolicyOptions {
  baseMs: number;
  maxMs: number;
  random?: () => number;
}

export class ReconnectPolicy {
  private attempt = 0;
  private readonly baseMs: number;
  private readonly maxMs: number;
  private readonly random: () => number;

  public constructor(options: ReconnectPolicyOptions) {
    if (options.baseMs <= 0) throw new Error('baseMs must be > 0');
    if (options.maxMs < options.baseMs) throw new Error('maxMs must be >= baseMs');
    this.baseMs = options.baseMs;
    this.maxMs = options.maxMs;
    this.random = options.random ?? Math.random;
  }

  /** Return the next backoff delay in ms and advance the attempt counter. */
  public nextDelay(): number {
    const raw = this.baseMs * 2 ** this.attempt;
    const capped = Math.min(this.maxMs, raw);
    this.attempt += 1;
    return Math.floor(this.random() * capped);
  }

  /** Current attempt counter (how many failures since last reset). */
  public get attempts(): number {
    return this.attempt;
  }

  /** Reset after a successful connect. */
  public reset(): void {
    this.attempt = 0;
  }
}
