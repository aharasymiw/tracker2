import { PCG32 } from './pcg32';

export { PCG32 } from './pcg32';
export type { PCG32Snapshot } from './pcg32';

/**
 * Factory that returns a fresh PCG32 seeded with `seed`. Prefer this over
 * calling `new PCG32(...)` directly so seed-handling stays centralized.
 */
export const createPrng = (seed: number | bigint): PCG32 => new PCG32(seed);
