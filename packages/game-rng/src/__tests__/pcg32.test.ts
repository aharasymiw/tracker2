import { describe, it, expect } from 'vitest';
import { PCG32, createPrng } from '../index';

const take = (rng: PCG32, n: number): number[] => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(rng.next());
  return out;
};

describe('PCG32', () => {
  it('produces the same sequence for the same seed (first 100 next() calls)', () => {
    const a = new PCG32(42);
    const b = new PCG32(42);
    const seqA = take(a, 100);
    const seqB = take(b, 100);
    expect(seqA).toEqual(seqB);
  });

  it('two instances built with the same seed are byte-identical over 10k samples', () => {
    const a = createPrng(0xdeadbeef);
    const b = createPrng(0xdeadbeef);
    for (let i = 0; i < 10_000; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('snapshot/restore reproduces the subsequent sequence', () => {
    const rng = new PCG32(1234n);
    take(rng, 50); // advance some
    const snap = rng.snapshot();
    const future = take(rng, 100);
    const restored = PCG32.restore(snap);
    const replayed = take(restored, 100);
    expect(replayed).toEqual(future);
  });

  it('clone() produces an independent generator with the same future sequence', () => {
    const rng = new PCG32(9999);
    take(rng, 10);
    const clone = rng.clone();
    const a = take(rng, 50);
    const b = take(clone, 50);
    expect(a).toEqual(b);
  });

  it('roll(1, 20) stays in range over 10,000 samples and covers all faces', () => {
    const rng = new PCG32(7);
    const seen = new Set<number>();
    for (let i = 0; i < 10_000; i++) {
      const r = rng.roll(1, 20);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(20);
      expect(Number.isInteger(r)).toBe(true);
      seen.add(r);
    }
    // With 10k samples on a d20 we expect every face to show up.
    expect(seen.size).toBe(20);
  });

  it('roll(min, max) handles degenerate single-value range', () => {
    const rng = new PCG32(1);
    for (let i = 0; i < 100; i++) {
      expect(rng.roll(5, 5)).toBe(5);
    }
  });

  it('roll() rejects non-integer or reversed bounds', () => {
    const rng = new PCG32(1);
    expect(() => rng.roll(1.5, 10)).toThrow();
    expect(() => rng.roll(10, 1)).toThrow();
  });

  it('different seeds produce different sequences (first 1000 numbers)', () => {
    const a = take(new PCG32(1), 1000);
    const b = take(new PCG32(2), 1000);
    // They may happen to overlap at some indices but should not be fully equal.
    let differences = 0;
    for (let i = 0; i < 1000; i++) {
      if (a[i] !== b[i]) differences++;
    }
    expect(differences).toBeGreaterThan(990);
  });

  it('next() returns unsigned 32-bit integers', () => {
    const rng = new PCG32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(2 ** 32);
    }
  });

  it('nextFloat() returns floats in [0, 1)', () => {
    const rng = new PCG32(42);
    for (let i = 0; i < 1000; i++) {
      const f = rng.nextFloat();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it('createPrng() is equivalent to `new PCG32(seed)`', () => {
    const a = createPrng(123);
    const b = new PCG32(123);
    expect(take(a, 50)).toEqual(take(b, 50));
  });
});
