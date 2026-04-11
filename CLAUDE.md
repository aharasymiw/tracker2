# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Land of Devastation (LOD)** — a modern client/server JavaScript rewrite of the classic post-apocalyptic BBS door game originally written by Scott M. Baker in Borland Pascal between 1990 and 1996. Faithful remake: preserve Puritron story, Sacre Base, wasteland, STR/DEX/AGL/HP stats, two-phase combat, fortresses, daily turn budget. Modernize only the technology.

- **Client:** React 19 + Vite + TypeScript + PixiJS v8 + Tailwind CSS 4 + Zustand + TanStack Query
- **Server:** Node.js 22 + Fastify + `@fastify/websocket` + Drizzle ORM + PostgreSQL 16 + ioredis + `@node-rs/argon2` + Pino
- **Shared:** TypeScript monorepo via pnpm workspaces. `protocol` (wire schemas), `game-core` (deterministic sim), `game-content` (JSON data + schemas), `game-rng` (seeded PCG32), `shared-utils`.
- **Authoritative server:** clients send intents; server resolves with a seeded PRNG and broadcasts deltas.
- **Concurrent online MMO-lite:** all players share one live world over WebSockets; combat is turn-based in sessions.

The full design plan lives in `/root/.claude/plans/kind-snuggling-curry.md`.

## Monorepo Layout

```
apps/
  client/        # React + Vite + PixiJS
  server/        # Node.js + Fastify + WS + Drizzle
packages/
  protocol/      # Versioned Zod wire schemas, PROTOCOL_VERSION
  game-core/     # Pure deterministic sim — no I/O, no Math.random, no Date
  game-content/  # JSON items/weapons/enemies/maps + Zod validators
  game-rng/      # Seeded PCG32 — only source of randomness in game-core
  shared-utils/  # Result type, branded IDs, logger interface
tools/
  content-validator/  # CI content validator
ops/
  docker/        # Dockerfile.server, docker-compose.dev.yml
  fly/           # Fly.io deploy configs
  migrations/    # Drizzle-generated SQL, hand-reviewed
e2e/             # Playwright tests
```

Use `@lod/*` package aliases (e.g. `@lod/game-core`, `@lod/protocol`).

## Commands

```bash
pnpm install          # Install all workspace dependencies
pnpm build            # Build every package and app
pnpm typecheck        # TypeScript validation across workspaces
pnpm lint             # ESLint
pnpm fmt              # Prettier write
pnpm fmt:check        # Prettier check
pnpm test             # Vitest unit tests (all packages)
pnpm test:watch       # Vitest watch mode
pnpm check            # Full validation: typecheck + lint + test
pnpm dev              # Run client and server in dev (parallel)
```

Run a single test file: `pnpm --filter @lod/game-core test -- src/path/to/file.test.ts`

## Architecture Rules

### Determinism (strictly enforced by ESLint)

`packages/game-core` and `packages/game-rng` must be pure and deterministic:

- No `Math.random` — use the PCG32 PRNG from `@lod/game-rng`.
- No `Date`, `Date.now`, `performance.now` — receive time as a logical tick number.
- No `process`, `fs`, network, or any I/O.
- Given the same inputs (including PRNG seed), outputs must be byte-identical.

Server combat authoritative, client combat may preview optimistically.

### Wire protocol

All WebSocket messages use versioned envelopes (`PROTOCOL_VERSION` in `@lod/protocol`). Zod-validates shape; `apps/server/src/game/authz.ts` validates semantics ("can this character do this action right now"). Sequence numbers prevent replay.

### Security model

- Server-authoritative everything. Never trust client for RNG, damage, movement validity, or inventory contents.
- Argon2id via `@node-rs/argon2`.
- `@fastify/secure-session` cookies (HttpOnly + Secure + SameSite=Lax).
- Rate limiting per-IP, per-account, per-WS-connection, per-intent-type.
- Daily turn counter decremented inside the same Postgres transaction that resolves the action.
- Inventory items have unique IDs + partial unique constraint — no dupes.
- Soft delete for characters and fortresses; never hard delete.

## Code Style

2-space indentation, semicolons, single quotes, trailing commas. `PascalCase` for React components, `camelCase` for functions/variables, `kebab-case` for filenames (e.g. `combat-session.ts`) except in package-internal folders where existing conventions apply. TypeScript strict mode everywhere. Prefer `import type` for type-only imports.

## Data Models (summary)

`users`, `sessions`, `characters` (STR/DEX/AGL/HP, `turns_remaining`, `last_turn_reset_at`), `inventory_items` (unique IDs, partial unique on owner), `fortresses`, `robo_defenders`, `combat_sessions` (full state in JSONB — rehydratable on restart), `quest_progress`, `puritron_parts`, `mail`, `bulletins`, `audit_log`.
