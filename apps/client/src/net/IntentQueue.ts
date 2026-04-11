import type { ClientToServerMessage } from '@lod/protocol';

/**
 * Bounded FIFO of outbound intents. While the WebSocket is disconnected,
 * intents accumulate here; once the socket reopens, `drain` is invoked to
 * flush them in order. Bounded so a long outage can't grow unbounded memory.
 */
export class IntentQueue {
  private readonly items: ClientToServerMessage[] = [];

  public constructor(private readonly maxSize = 256) {}

  public enqueue(message: ClientToServerMessage): void {
    if (this.items.length >= this.maxSize) {
      this.items.shift();
    }
    this.items.push(message);
  }

  public get size(): number {
    return this.items.length;
  }

  public drain(send: (message: ClientToServerMessage) => void): void {
    while (this.items.length > 0) {
      const next = this.items.shift();
      if (next === undefined) break;
      send(next);
    }
  }

  public clear(): void {
    this.items.length = 0;
  }
}
