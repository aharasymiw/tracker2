import { envelopeSchema, type Envelope } from '@lod/protocol';
import { err, ok, type Result } from '@lod/shared-utils';

/**
 * Per-connection sequence tracker. Rejects:
 *   - messages whose envelope does not match the Zod schema
 *   - messages whose `seq` is not strictly greater than the last accepted seq
 *
 * Strictly-increasing `seq` is load-bearing for replay prevention: without
 * it, a malicious client could re-send old state-changing intents.
 */
export type EnvelopeError =
  | { kind: 'invalid_json'; message: string }
  | { kind: 'invalid_envelope'; message: string }
  | { kind: 'stale_seq'; message: string };

export class EnvelopeTracker {
  private lastSeq = -1;

  parse(raw: string): Result<Envelope, EnvelopeError> {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'invalid json';
      return err({ kind: 'invalid_json', message });
    }

    const parsed = envelopeSchema.safeParse(json);
    if (!parsed.success) {
      return err({
        kind: 'invalid_envelope',
        message: parsed.error.issues.map((i) => i.message).join('; '),
      });
    }

    if (parsed.data.seq <= this.lastSeq) {
      return err({
        kind: 'stale_seq',
        message: `seq ${parsed.data.seq} <= last ${this.lastSeq}`,
      });
    }
    this.lastSeq = parsed.data.seq;
    return ok(parsed.data);
  }

  /**
   * Test-only helper. Do not call from production code.
   */
  getLastSeq(): number {
    return this.lastSeq;
  }
}
