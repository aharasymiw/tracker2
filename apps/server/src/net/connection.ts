import type { CharacterId, UserId } from '@lod/shared-utils';
import { PROTOCOL_VERSION } from '@lod/protocol';
import type { WebSocketTransport } from './transport.js';
import { EnvelopeTracker } from './envelope.js';

/**
 * Per-WebSocket connection state. Owned by the gateway; referenced by
 * GameWorld via its `connections` map for outbound broadcasts.
 */
export class Connection {
  public readonly envelope = new EnvelopeTracker();
  private outboundSeq = 0;

  constructor(
    public readonly userId: UserId,
    public readonly characterId: CharacterId,
    public readonly transport: WebSocketTransport,
  ) {}

  nextOutboundSeq(): number {
    this.outboundSeq += 1;
    return this.outboundSeq;
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
