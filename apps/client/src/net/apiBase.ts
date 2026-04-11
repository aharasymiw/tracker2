/**
 * URL builders for the two transports the client uses against the server.
 *
 * When `VITE_API_URL` / `VITE_WS_URL` are set at build time (via Cloudflare
 * Pages env vars, or a local `.env`), the helpers prepend the full origin so
 * the Pages-hosted client can reach the Fly-hosted server cross-origin.
 *
 * When unset — dev, tests, and anywhere the server is served from the same
 * origin as the client — `apiUrl` emits relative paths so the Vite dev proxy
 * keeps working and the existing unit tests (which assert `'/api/...'`)
 * continue to pass.
 */

const API_BASE = stripTrailingSlash(import.meta.env.VITE_API_URL ?? '');
const WS_BASE = stripTrailingSlash(import.meta.env.VITE_WS_URL ?? '');

function stripTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

/**
 * Build an HTTP URL for a server endpoint. Accepts either an absolute
 * `/api/...` path (preferred) or a bare segment.
 */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return API_BASE === '' ? normalized : `${API_BASE}${normalized}`;
}

/**
 * Build a WebSocket URL. Precedence:
 *  1. `VITE_WS_URL` when set at build time.
 *  2. Derived from `window.location` in the browser (dev same-origin).
 *  3. `ws://localhost:4000` fallback for SSR / unit test environments.
 */
export function wsUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (WS_BASE !== '') return `${WS_BASE}${normalized}`;
  if (typeof window === 'undefined') return `ws://localhost:4000${normalized}`;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${normalized}`;
}
