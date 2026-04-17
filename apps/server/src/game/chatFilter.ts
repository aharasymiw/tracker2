/**
 * Basic server-side chat content filter. Runs before a message is broadcast.
 *
 * Design constraints:
 *   - Must not block the event loop for any reasonable input (500-char max
 *     enforced by protocol schema).
 *   - Must be additive: only block, never rewrite. Players see either their
 *     message or nothing — no "f***" asterisk substitution that invites
 *     creative misspelling arms races.
 *   - Must surface a clear rejection reason so the sender knows what to fix.
 *
 * The word list is deliberately short and only covers slurs and extreme
 * content. General profanity is allowed; this is a post-apocalyptic wasteland.
 * Expand via the `BLOCKED_PATTERNS` array as moderation data comes in.
 */

const BLOCKED_PATTERNS: RegExp[] = [
  // Placeholder patterns — real deployment should load from a config or DB.
  // Using word-boundary anchors so substrings of legitimate words don't match.
  // These are intentionally non-exhaustive examples; a production game would
  // use a curated list.
];

const MAX_CONSECUTIVE_CAPS = 30;
const MAX_REPEATED_CHAR = 10;

export interface ChatFilterResult {
  allowed: boolean;
  reason?: string;
}

export function filterChatMessage(body: string): ChatFilterResult {
  if (body.trim().length === 0) {
    return { allowed: false, reason: 'empty message' };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(body)) {
      return { allowed: false, reason: 'message contains blocked content' };
    }
  }

  const capsRun = /[A-Z]{30,}/;
  if (capsRun.test(body)) {
    return {
      allowed: false,
      reason: `more than ${MAX_CONSECUTIVE_CAPS} consecutive capitals`,
    };
  }

  const repeatedChar = /(.)\1{9,}/;
  if (repeatedChar.test(body)) {
    return {
      allowed: false,
      reason: `character repeated more than ${MAX_REPEATED_CHAR} times`,
    };
  }

  return { allowed: true };
}
