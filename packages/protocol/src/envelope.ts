import { z } from 'zod';
import { PROTOCOL_VERSION } from './version';

/**
 * Outer WebSocket envelope. Every client<->server message is wrapped in one
 * of these. The `payload` is refined at a second layer by `clientToServer`
 * or `serverToClient` discriminated unions.
 *
 * - `v`   : protocol version; must equal PROTOCOL_VERSION at time of parse.
 * - `seq` : monotonic per-connection sequence number used for replay
 *           prevention and ack ordering. Strictly increasing.
 * - `ts`  : client-stamped milliseconds. Used ONLY for round-trip-time
 *           calculations; never trust it for game logic.
 * - `type`: discriminator for the payload schema.
 * - `payload`: validated by the inner schemas.
 */
export const envelopeSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  seq: z.number().int().nonnegative(),
  ts: z.number().int().nonnegative(),
  type: z.string().min(1),
  payload: z.unknown(),
});

export type Envelope = z.infer<typeof envelopeSchema>;

/**
 * Convenience builder used mostly by clients and by tests. Callers are
 * responsible for supplying a correct, monotonically-increasing `seq`.
 */
export const makeEnvelope = <T>(type: string, payload: T, seq: number): Envelope => ({
  v: PROTOCOL_VERSION,
  seq,
  ts: Date.now(),
  type,
  payload,
});
