import { useEffect, useRef, type ReactElement } from 'react';
import { PixiApp } from '../render/PixiApp';
import { WebSocketClient } from '../net/WebSocketClient';
import { useWorldStore } from '../state/worldStore';
import { HUD } from './HUD';
import { InventoryPanel } from './InventoryPanel';
import { CombatOverlay } from './CombatOverlay';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

function buildWebSocketUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:4000/ws';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export function GamePage(): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixiRef = useRef<PixiApp | null>(null);
  const socketRef = useRef<WebSocketClient | null>(null);
  const applySnapshot = useWorldStore((state) => state.applySnapshot);
  const applyDelta = useWorldStore((state) => state.applyDelta);
  const reset = useWorldStore((state) => state.reset);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const pixi = new PixiApp({
      canvas,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });
    pixiRef.current = pixi;
    void pixi.init().catch((error: unknown) => {
      console.error('[pixi] init failed', error);
    });

    const client = new WebSocketClient({
      url: buildWebSocketUrl(),
      handlers: {
        onMessage: (message) => {
          switch (message.type) {
            case 'StateSnapshot':
              applySnapshot(message.payload);
              break;
            case 'StateDelta':
              applyDelta(message.payload);
              break;
            default:
              // Other message variants handled in later phases.
              break;
          }
        },
        onClose: () => {
          // intentionally no-op; reconnect is automatic
        },
        onError: (error) => {
          console.warn('[ws] error', error);
        },
      },
    });
    socketRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      pixi.destroy();
      pixiRef.current = null;
      socketRef.current = null;
      reset();
    };
  }, [applyDelta, applySnapshot, reset]);

  return (
    <div className="grid h-full w-full grid-cols-[1fr_auto] grid-rows-[auto_1fr] bg-neutral-950">
      <div className="col-span-2 row-start-1">
        <HUD />
      </div>
      <div className="relative col-start-1 row-start-2 flex items-center justify-center overflow-hidden bg-black">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="max-h-full max-w-full"
        />
        <CombatOverlay />
      </div>
      <div className="col-start-2 row-start-2">
        <InventoryPanel />
      </div>
    </div>
  );
}
