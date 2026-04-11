/**
 * math-utils — the ONLY file in @lod/game-core allowed to reference the `Math`
 * global. All other files must import these helpers instead of touching `Math`
 * directly.
 *
 * Why: the package-wide ESLint rule bans the `Math` global to prevent
 * `Math.random` from sneaking into deterministic game logic. Non-random helpers
 * like `floor`, `abs`, `max`, etc. are still needed, so we centralize them here
 * with per-line `eslint-disable` comments. This keeps the audit surface for
 * determinism violations to a single file.
 *
 * These helpers are intentionally thin pass-throughs; behaviour should match
 * the underlying `Math` methods exactly.
 */

// eslint-disable-next-line no-restricted-globals
export const floor = (n: number): number => Math.floor(n);

// eslint-disable-next-line no-restricted-globals
export const ceil = (n: number): number => Math.ceil(n);

// eslint-disable-next-line no-restricted-globals
export const round = (n: number): number => Math.round(n);

// eslint-disable-next-line no-restricted-globals
export const abs = (n: number): number => Math.abs(n);

// eslint-disable-next-line no-restricted-globals
export const max = (...values: number[]): number => Math.max(...values);

// eslint-disable-next-line no-restricted-globals
export const min = (...values: number[]): number => Math.min(...values);

// eslint-disable-next-line no-restricted-globals
export const log2 = (n: number): number => Math.log2(n);

// eslint-disable-next-line no-restricted-globals
export const pow = (base: number, exp: number): number => Math.pow(base, exp);

// eslint-disable-next-line no-restricted-globals
export const sqrt = (n: number): number => Math.sqrt(n);

// eslint-disable-next-line no-restricted-globals
export const sign = (n: number): number => Math.sign(n);

/**
 * Clamp `x` to the inclusive range [lo, hi]. If `lo > hi` the behaviour is
 * undefined; callers are expected to pass sensible bounds.
 */
export const clamp = (x: number, lo: number, hi: number): number =>
  x < lo ? lo : x > hi ? hi : x;

/**
 * Chebyshev (king-move) distance — the largest of |dx|, |dy|. Used by AoE
 * rings (radiation grenade) and by combat phase transition checks.
 */
export const chebyshevDistance = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): number => max(abs(a.x - b.x), abs(a.y - b.y));

/**
 * Manhattan (taxicab) distance — |dx| + |dy|. Used as the A* heuristic.
 */
export const manhattanDistance = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): number => abs(a.x - b.x) + abs(a.y - b.y);

/**
 * Euclidean distance. Useful for ring/sphere effects and for tie-break
 * heuristics. Pulled in because Pathfinding uses sqrt(2) diagonal costs.
 */
export const euclideanDistance = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return sqrt(dx * dx + dy * dy);
};

/** Convenience: `sqrt(2)` as a constant so we don't recompute it. */
export const SQRT2 = sqrt(2);
