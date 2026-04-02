import { describe, expect, it } from 'vitest';

import { estimateIterationsFromProbe } from '@/crypto/pbkdf2';

describe('estimateIterationsFromProbe', () => {
  it('projects a higher iteration count for faster devices', () => {
    expect(
      estimateIterationsFromProbe({
        probeIterations: 150_000,
        durationMs: 120,
      }),
    ).toBeGreaterThan(250_000);
  });

  it('respects the configured floor and ceiling', () => {
    expect(
      estimateIterationsFromProbe({
        probeIterations: 150_000,
        durationMs: 2_000,
      }),
    ).toBe(250_000);

    expect(
      estimateIterationsFromProbe({
        probeIterations: 150_000,
        durationMs: 1,
      }),
    ).toBe(900_000);
  });
});
