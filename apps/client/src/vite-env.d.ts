/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Absolute base URL for HTTP calls to the server (e.g. `https://lod-server.fly.dev`).
   * When unset, the client uses relative paths so the Vite dev proxy can forward
   * `/api/*` to `localhost:4000`.
   */
  readonly VITE_API_URL?: string;
  /**
   * Absolute base URL for the WebSocket gateway (e.g. `wss://lod-server.fly.dev`).
   * When unset, the client derives the URL from `window.location`.
   */
  readonly VITE_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
