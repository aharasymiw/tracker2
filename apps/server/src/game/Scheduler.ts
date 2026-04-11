import type { Logger as PinoLogger } from 'pino';

/**
 * Fixed-rate tick scheduler.
 *
 * Uses `setTimeout` to self-schedule rather than `setInterval` so that slow
 * ticks don't cause callback pile-ups. A tick that overruns (> 100 ms) logs
 * a warning and skips the next scheduled tick rather than compounding lag.
 *
 * Intended for a single `GameWorld` callback. Multiple systems should nest
 * under that callback, not register their own schedulers.
 */
export type TickCallback = (tick: number) => void;

export class Scheduler {
  private readonly intervalMs: number;
  private running = false;
  private tickNumber = 0;
  private timer: NodeJS.Timeout | null = null;
  private nextTickAtMs = 0;
  private readonly overrunThresholdMs = 100;

  constructor(
    private readonly hz: number,
    private readonly onTick: TickCallback,
    private readonly logger: PinoLogger,
  ) {
    if (hz <= 0 || !Number.isFinite(hz)) {
      throw new Error(`Scheduler hz must be > 0, got ${hz}`);
    }
    this.intervalMs = 1000 / hz;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.nextTickAtMs = Date.now() + this.intervalMs;
    this.schedule();
    this.logger.info({ hz: this.hz }, 'scheduler started');
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.logger.info('scheduler stopped');
  }

  getTickNumber(): number {
    return this.tickNumber;
  }

  private schedule(): void {
    if (!this.running) return;
    const delay = Math.max(0, this.nextTickAtMs - Date.now());
    this.timer = setTimeout(() => this.fire(), delay);
  }

  private fire(): void {
    if (!this.running) return;
    const startedAt = Date.now();
    this.tickNumber += 1;
    try {
      this.onTick(this.tickNumber);
    } catch (error: unknown) {
      this.logger.error(
        { err: error, tick: this.tickNumber },
        'tick callback threw',
      );
    }
    const elapsedMs = Date.now() - startedAt;
    this.nextTickAtMs += this.intervalMs;

    if (elapsedMs > this.overrunThresholdMs) {
      this.logger.warn(
        { elapsedMs, tick: this.tickNumber },
        'tick overran; skipping next tick',
      );
      this.nextTickAtMs += this.intervalMs;
    }

    // If we've fallen more than one tick behind, snap forward so we don't
    // compound lag.
    const now = Date.now();
    if (this.nextTickAtMs < now) {
      this.nextTickAtMs = now + this.intervalMs;
    }

    this.schedule();
  }
}
