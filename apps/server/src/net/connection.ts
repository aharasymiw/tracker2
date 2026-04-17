import type { CharacterId, UserId } from '@lod/shared-utils';
import { PROTOCOL_VERSION } from '@lod/protocol';
import type { WebSocketTransport } from './transport.js';
import { EnvelopeTracker } from './envelope.js';

const WS_RATE_LIMIT_WINDOW_MS = 1000;
const WS_RATE_LIMIT_MAX = 30;
const WS_RATE_LIMIT_KICK_MULTIPLIER = 3;

/**
 * Per-WebSocket connection state. Owned by the gateway; referenced by
 * GameWorld via its `connections` map for outbound broadcasts.
 */
export class Connection {
  public readonly envelope = new EnvelopeTracker();
  private outboundSeq = 0;

  private rateLimitWindowStart = 0;
  private rateLimitCount = 0;

  constructor(
    public readonly userId: UserId,
    public readonly characterId: CharacterId,
    public readonly transport: WebSocketTransport,
  ) {}

  nextOutboundSeq(): number {
    this.outboundSeq += 1;
    return this.outboundSeq;
  }

  /**
   * In-memory per-connection rate gate. Returns true if the message is
   * allowed; false if throttled. Callers should send an error and skip
   * dispatch when false. If the client exceeds `KICK_MULTIPLIER × MAX` in
   * a single window, the connection is forcibly closed.
   */
  checkMessageRate(): boolean {
    const now = Date.now();
    if (now - this.rateLimitWindowStart > WS_RATE_LIMIT_WINDOW_MS) {
      this.rateLimitWindowStart = now;
      this.rateLimitCount = 0;
    }
    this.rateLimitCount += 1;
    if (this.rateLimitCount > WS_RATE_LIMIT_MAX * WS_RATE_LIMIT_KICK_MULTIPLIER) {
      this.close(4429, 'rate limit exceeded');
      return false;
    }
    return this.rateLimitCount <= WS_RATE_LIMIT_MAX;
  }

  sendJson(type: string, payload: unknown): void {
    const message = JSON.stringify({
      v: PROTOCOL_VERSION,
      seq: this.nextOutboundSeq(),
      ts: Date.now(),
      type,
      payload,
    });
    this.transport.send(message);
  }

  close(code?: number, reason?: string): void {
    this.transport.close(code, reason);
  }
}
