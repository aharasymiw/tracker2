# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the app code. Keep feature logic in `src/features/`, persistence in `src/storage/`, crypto helpers in `src/crypto/`, utilities in `src/lib/`, schemas in `src/schemas/`, and types in `src/types/`. Reusable UI lives in `src/components/`. Static assets, the manifest, redirects, and the service worker belong in `public/`. End-to-end tests live in `e2e/`. Use the `@/` alias for imports from `src`.

## Build, Test, and Development Commands
Use `npm` with the checked-in lockfile.

- `npm run dev` starts the local app on port `4173`.
- `npm run build` creates the production bundle in `dist/`.
- `npm run preview` serves the built app locally.
- `npm run typecheck` runs TypeScript project checks.
- `npm run lint` runs Vite+ linting.
- `npm run fmt` formats the codebase with the repo’s Vite+ formatter settings.
- `npm run check` runs the project-wide validation suite.
- `npm test` runs unit tests once.
- `npm run test:e2e` runs Playwright against the local dev server.

## Coding Style & Naming Conventions
Follow the existing TypeScript + React style: 2-space indentation, semicolons, single quotes, and trailing commas. Prefer strict typing and small, focused modules. Use `PascalCase` for React components, `camelCase` for functions and variables, and `kebab-case` for feature files such as `goal-math.ts`. Co-locate tests with the module they cover when practical. Prefer alias imports like `@/storage/db` over long relative paths.

## Testing Guidelines
Unit tests use Vitest and should be named `*.test.ts` under `src/`; the config includes `src/**/*.test.ts` and excludes `e2e/`. End-to-end tests use Playwright from `e2e/*.spec.ts` and currently run in mobile Chromium. Add unit tests for new logic in crypto, storage, schemas, and calculations. For UI or flow changes, add or update a Playwright scenario when behavior crosses screens or touches persistence.

## Commit & Pull Request Guidelines
This workspace does not include `.git` history, so no house commit convention could be derived directly. Use short, imperative commit subjects such as `Add encrypted backup import validation`. Pull requests should include a clear summary, linked issue when available, test notes (`npm test`, `npm run test:e2e`), and screenshots for visible UI changes. Call out storage, crypto, or schema changes explicitly.

## Security & Configuration Tips
This app is local-first and stores encrypted user data in IndexedDB. Never log decrypted vault contents, secrets, or raw key material. Keep service-worker changes limited to app-shell assets and avoid introducing any cache path that could expose private data.
