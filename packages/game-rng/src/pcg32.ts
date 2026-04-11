/**
 * PCG32 — Permuted Congruential Generator, 32-bit output.
 *
 * This is the ONLY source of randomness allowed inside @lod/game-core. It is
 * deterministic, seedable, and supports snapshot/restore so combat rolls can be
 * replayed for auditing and fuzz testing. Never import Math.random in game code.
 *
 * Reference: https://www.pcg-random.org/
 */

const MULTIPLIER = 6364136223846793005n;
const DEFAULT_INC = 1442695040888963407n;
const MASK_64 = 0xffffffffffffffffn;
const MASK_32 = 0xffffffffn;

// Math.trunc is a pure coercion helper, not a source of randomness. game-rng
// itself is allowed to audit this one usage in one place.
const toBigInt = (v: bigint | number): bigint =>
  // eslint-disable-next-line no-restricted-globals
  typeof v === 'bigint' ? v : BigInt(Math.trunc(v));

export interface PCG32Snapshot {
  /** 64-bit state, serialized as a decimal string. */
  state: string;
  /** 64-bit odd increment, serialized as a decimal string. */
  inc: string;
}

export class PCG32 {
  private state: bigint;
  private inc: bigint;

  /**
   * Create a new PCG32. `seed` seeds the state; `stream` selects the output
   * stream (must produce an odd increment — this is handled automatically).
   */
  constructor(seed: bigint | number, stream: bigint | number = DEFAULT_INC) {
    const streamBig = toBigInt(stream);
    // inc must be odd per PCG spec.
    const incOdd = ((streamBig << 1n) | 1n) & MASK_64;
    this.inc = incOdd;
    this.state = 0n;
    // Canonical PCG seeding: step, add seed, step again.
    this.state = (this.state + this.inc) & MASK_64;
    this.nextRaw();
    this.state = (this.state + (toBigInt(seed) & MASK_64)) & MASK_64;
    this.nextRaw();
  }

  /** Internal LCG + output function; returns a Uint32 as a plain number. */
  private nextRaw(): number {
    const oldState = this.state;
    this.state = (oldState * MULTIPLIER + this.inc) & MASK_64;

    const xorshifted = Number((((oldState >> 18n) ^ oldState) >> 27n) & MASK_32);
    const rot = Number((oldState >> 59n) & 31n);
    // Rotate right by `rot`.
    const rotAmt = rot & 31;
    const result =
      ((xorshifted >>> rotAmt) | (xorshifted << ((-rotAmt) & 31))) >>> 0;
    return result;
  }

  /** Returns the next Uint32 in [0, 2^32). */
  next(): number {
    return this.nextRaw();
  }

  /**
   * Returns a float in [0, 1) with 53 bits of precision by combining two
   * Uint32s — same technique as Node's and V8's built-in generators.
   */
  nextFloat(): number {
    const hi = this.nextRaw() >>> 5; // top 27 bits
    const lo = this.nextRaw() >>> 6; // top 26 bits
    return (hi * 67108864 + lo) / 9007199254740992; // 2^26 and 2^53
  }

  /**
   * Returns an inclusive integer in [min, max]. Uses rejection sampling to
   * avoid modulo bias.
   */
  roll(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new Error(`PCG32.roll: bounds must be integers, got [${min}, ${max}]`);
    }
    if (max < min) {
      throw new Error(`PCG32.roll: max (${max}) must be >= min (${min})`);
    }
    const range = max - min + 1;
    if (range <= 0) {
      // Degenerate case for unreachable overflow; treat as single-value.
      return min;
    }
    // Rejection-sample to avoid modulo bias.
    // threshold = 2^32 mod range, largest multiple of range <= 2^32 is 2^32 - threshold.
    const MOD = 0x100000000; // 2^32
    const threshold = MOD % range;
    const limit = MOD - threshold;
    // Bound the number of retries just in case; range > 0 so loop terminates almost surely.
     
    while (true) {
      const r = this.nextRaw();
      if (r < limit) {
        return min + (r % range);
      }
    }
  }

  /** Capture the full generator state so it can be restored later. */
  snapshot(): PCG32Snapshot {
    return {
      state: this.state.toString(),
      inc: this.inc.toString(),
    };
  }

  /**
   * Rebuild a PCG32 from a prior snapshot. Bypasses the standard constructor
   * seeding sequence so the recovered instance produces the exact same future
   * sequence as the original.
   */
  static restore(snapshot: PCG32Snapshot): PCG32 {
    const state = BigInt(snapshot.state) & MASK_64;
    const inc = BigInt(snapshot.inc) & MASK_64;
    // Build an instance without running the seeding ritual.
    // We call the constructor then overwrite the state.
    const instance = new PCG32(0);
    // Overwrite the seeded state/inc — these are class-private, so this is
    // only reachable from within PCG32 itself.
    instance.state = state;
    instance.inc = inc;
    return instance;
  }

  /** Produce an independent copy with identical current state. */
  clone(): PCG32 {
    return PCG32.restore(this.snapshot());
  }
}
