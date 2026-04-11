import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger as PinoLogger } from 'pino';
import { Scheduler } from '../game/Scheduler.js';

function makeLogger(): PinoLogger {
  const noop = (): void => {};
  const logger = {
    info: noop,
    debug: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    trace: noop,
    child: () => logger,
  };
  return logger as unknown as PinoLogger;
}

describe('Scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onTick at the configured rate', () => {
    const ticks: number[] = [];
    const scheduler = new Scheduler(10, (t) => ticks.push(t), makeLogger());
    scheduler.start();

    // 10 Hz → 100 ms/tick. Advance 550 ms → expect 5 ticks.
    vi.advanceTimersByTime(550);
    expect(ticks.length).toBeGreaterThanOrEqual(5);
    expect(ticks.length).toBeLessThanOrEqual(6);
    const first = ticks[0];
    expect(first).toBe(1);
    scheduler.stop();
  });

  it('stops cleanly', () => {
    const ticks: number[] = [];
    const scheduler = new Scheduler(10, (t) => ticks.push(t), makeLogger());
    scheduler.start();
    vi.advanceTimersByTime(250);
    scheduler.stop();
    const countAtStop = ticks.length;
    vi.advanceTimersByTime(500);
    expect(ticks.length).toBe(countAtStop);
  });

  it('rejects invalid hz', () => {
    expect(() => new Scheduler(0, () => {}, makeLogger())).toThrow();
    expect(() => new Scheduler(-1, () => {}, makeLogger())).toThrow();
  });
});
