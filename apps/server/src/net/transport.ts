/**
 * Abstract WebSocket transport. The gateway talks to this interface so we
 * can swap `@fastify/websocket` + `ws` for uWebSockets.js if/when load
 * testing justifies it.
 */
export interface WebSocketTransport {
  send(message: string): void;
  close(code?: number, reason?: string): void;
  onMessage(handler: (data: string) => void): void;
  onClose(handler: () => void): void;
}
