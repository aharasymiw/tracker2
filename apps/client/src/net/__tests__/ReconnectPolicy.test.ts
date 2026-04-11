import { describe, it, expect } from 'vitest';
import { ReconnectPolicy } from '../ReconnectPolicy';

describe('ReconnectPolicy', () => {
  it('rejects invalid options', () => {
    expect(() => new ReconnectPolicy({ baseMs: 0, maxMs: 10 })).toThrow();
    expect(() => new ReconnectPolicy({ baseMs: 100, maxMs: 10 })).toThrow();
  });

  it('increments attempts on each nextDelay call', () => {
    const policy = new ReconnectPolicy({
      baseMs: 100,
      maxMs: 5_000,
      random: () => 1,
    });
    expect(policy.attempts).toBe(0);
    policy.nextDelay();
    expect(policy.attempts).toBe(1);
    policy.nextDelay();
    expect(policy.attempts).toBe(2);
  });

  it('produces exponential growth up to the cap', () => {
    // random=1 means we always hit the full cap ceiling.
    const policy = new ReconnectPolicy({
      baseMs: 100,
      maxMs: 1_600,
      random: () => 0.999999,
    });
    const delays: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      delays.push(policy.nextDelay());
    }
    // Expected raw caps: 100, 200, 400, 800, 1600, 1600
    const [d0, d1, d2, d3, d4, d5] = delays;
    expect(d0).toBeDefined();
    expect(d0 ?? 0).toBeGreaterThanOrEqual(99);
    expect(d0 ?? 0).toBeLessThanOrEqual(100);
    expect(d1 ?? 0).toBeLessThanOrEqual(200);
    expect(d2 ?? 0).toBeLessThanOrEqual(400);
    expect(d3 ?? 0).toBeLessThanOrEqual(800);
    expect(d4 ?? 0).toBeLessThanOrEqual(1_600);
    expect(d5 ?? 0).toBeLessThanOrEqual(1_600);
    // Delays must be monotonic up to the cap.
    expect(d1 ?? 0).toBeGreaterThan(d0 ?? 0);
    expect(d4 ?? 0).toBeGreaterThan(d3 ?? 0);
  });

  it('applies jitter by sampling below the exponential ceiling', () => {
    const fakeRandom = () => 0.25;
    const policy = new ReconnectPolicy({
      baseMs: 100,
      maxMs: 10_000,
      random: fakeRandom,
    });
    // attempt 0: cap=100, expected floor(0.25*100)=25
    expect(policy.nextDelay()).toBe(25);
    // attempt 1: cap=200, expected floor(0.25*200)=50
    expect(policy.nextDelay()).toBe(50);
  });

  it('reset returns the attempt counter to zero', () => {
    const policy = new ReconnectPolicy({
      baseMs: 100,
      maxMs: 5_000,
      random: () => 0,
    });
    policy.nextDelay();
    policy.nextDelay();
    expect(policy.attempts).toBe(2);
    policy.reset();
    expect(policy.attempts).toBe(0);
  });
});
