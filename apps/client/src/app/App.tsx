import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { AppRoutes } from './routes';

/**
 * Top-level layout. A minimal header with app branding and a main content
 * area rendered via the router. Nested routes mount inside `<AppRoutes />`.
 */
export function App(): ReactElement {
  return (
    <div className="flex h-full flex-col bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/80 px-4 py-2">
        <Link
          to="/"
          className="font-mono text-lg font-bold tracking-wide text-toxic-500"
        >
          LAND OF DEVASTATION
        </Link>
        <nav className="flex items-center gap-4 text-sm text-neutral-400">
          <Link to="/characters" className="hover:text-toxic-400">
            Characters
          </Link>
          <Link to="/game" className="hover:text-toxic-400">
            Game
          </Link>
        </nav>
      </header>
      <main className="flex min-h-0 flex-1">
        <AppRoutes />
      </main>
    </div>
  );
}
