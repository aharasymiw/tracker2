import {
  envelopeSchema,
  makeEnvelope,
  serverToClientMessageSchema,
  type ClientToServerMessage,
  type ServerToClientMessage,
} from '@lod/protocol';
import { ReconnectPolicy } from './ReconnectPolicy';
import { IntentQueue } from './IntentQueue';

export type ConnectionState = 'idle' | 'connecting' | 'open' | 'closed';

export interface WebSocketClientHandlers {
  onMessage: (message: ServerToClientMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

export interface WebSocketClientOptions {
  url: string;
  handlers: WebSocketClientHandlers;
  policy?: ReconnectPolicy;
  queue?: IntentQueue;
  /** Inject for tests. Defaults to the global WebSocket constructor. */
  socketFactory?: (url: string) => WebSocket;
  /** Inject for tests. Defaults to `setTimeout`. */
  scheduler?: (fn: () => void, ms: number) => unknown;
}

/**
 * Reconnecting WebSocket client for the LoD wire protocol. Responsibilities:
 *
 * - Envelope every outbound intent with a strictly increasing `seq`.
 * - Validate every inbound frame against `envelopeSchema` and the
 *   server-to-client discriminated union. Malformed frames are logged and
 *   dropped; we never dispatch unvalidated payloads.
 * - Reconnect with exponential backoff on unexpected close.
 * - Queue intents while disconnected and flush them on reconnect.
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private seq = 0;
  private state: ConnectionState = 'idle';
  private readonly policy: ReconnectPolicy;
  private readonly queue: IntentQueue;
  private readonly socketFactory: (url: string) => WebSocket;
  private readonly scheduler: (fn: () => void, ms: number) => unknown;
  private disposed = false;

  public constructor(private readonly options: WebSocketClientOptions) {
    this.policy =
      options.policy ?? new ReconnectPolicy({ baseMs: 500, maxMs: 15_000 });
    this.queue = options.queue ?? new IntentQueue();
    this.socketFactory =
      options.socketFactory ?? ((url: string) => new WebSocket(url));
    this.scheduler =
      options.scheduler ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  }

  public get connectionState(): ConnectionState {
    return this.state;
  }

  public connect(): void {
    if (this.disposed) return;
    if (this.state === 'connecting' || this.state === 'open') return;
    this.state = 'connecting';
    const socket = this.socketFactory(this.options.url);
    this.ws = socket;
    socket.addEventListener('open', this.handleOpen);
    socket.addEventListener('message', this.handleMessage);
    socket.addEventListener('close', this.handleClose);
    socket.addEventListener('error', this.handleError);
  }

  public disconnect(): void {
    this.disposed = true;
    if (this.ws !== null) {
      try {
        this.ws.close();
      } catch {
        // ignore close errors; we're disposing
      }
    }
    this.ws = null;
    this.state = 'closed';
  }

  /**
   * Send (or enqueue) a client-to-server intent. The caller never sees the
   * envelope; we wrap on write and strip on read. Returns `true` when sent
   * immediately, `false` when queued for a later reconnect.
   */
  public send(message: ClientToServerMessage): boolean {
    const envelope = makeEnvelope(message.type, message, this.seq);
    this.seq += 1;
    if (this.ws !== null && this.state === 'open') {
      try {
        this.ws.send(JSON.stringify(envelope));
        return true;
      } catch (error) {
        this.options.handlers.onError?.(asError(error));
        this.queue.enqueue(message);
        return false;
      }
    }
    this.queue.enqueue(message);
    return false;
  }

  private handleOpen = (): void => {
    this.state = 'open';
    this.policy.reset();
    this.options.handlers.onOpen?.();
    // Flush any queued intents. We use `send` so each gets a fresh envelope.
    this.queue.drain((message) => {
      this.send(message);
    });
  };

  private handleMessage = (event: MessageEvent): void => {
    const raw = event.data;
    if (typeof raw !== 'string') {
      console.warn('[ws] dropped non-string frame');
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.warn('[ws] failed to parse JSON frame', error);
      return;
    }
    const envelopeResult = envelopeSchema.safeParse(parsed);
    if (!envelopeResult.success) {
      console.warn('[ws] invalid envelope', envelopeResult.error.issues);
      return;
    }
    // The envelope `payload` is `unknown`; the server-to-client variants each
    // wrap their real payload under a `type` + `payload` pair, so we rebuild
    // the message shape before handing off to Zod.
    const candidate = {
      type: envelopeResult.data.type,
      payload: envelopeResult.data.payload,
    };
    const messageResult = serverToClientMessageSchema.safeParse(candidate);
    if (!messageResult.success) {
      console.warn('[ws] invalid server message', messageResult.error.issues);
      return;
    }
    this.options.handlers.onMessage(messageResult.data);
  };

  private handleClose = (): void => {
    this.state = 'closed';
    this.ws = null;
    this.options.handlers.onClose?.();
    if (!this.disposed) {
      this.scheduleReconnect();
    }
  };

  private handleError = (_event: Event): void => {
    this.options.handlers.onError?.(new Error('websocket error'));
  };

  private scheduleReconnect(): void {
    const delay = this.policy.nextDelay();
    this.scheduler(() => {
      if (this.disposed) return;
      this.connect();
    }, delay);
  }
}

function asError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === 'string' ? value : 'unknown error');
}
