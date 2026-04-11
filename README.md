# Land of Devastation

A modern, high-performance, secure client/server JavaScript rewrite of the classic post-apocalyptic BBS door game **Land of Devastation**, originally written by Scott M. Baker in Borland Pascal between 1990 and 1996.

The faithful remake preserves the Puritron quest, Sacre Base, wasteland exploration, STR/DEX/AGL/HP stats, two-phase turn-based combat (Long Range → Close Combat), player-built fortresses with RoboDefenders, and daily turn budgets — while delivering them as a modern web application with a concurrent shared world.

## Stack

- **Client** — React 19, Vite, TypeScript, PixiJS v8, Tailwind CSS 4, Zustand, TanStack Query
- **Server** — Node.js 22, Fastify, `@fastify/websocket`, Drizzle ORM, PostgreSQL 16, ioredis, `@node-rs/argon2`, Pino
- **Shared** — TypeScript monorepo via pnpm workspaces; deterministic game core with seeded PCG32 PRNG; versioned Zod wire protocol

## Layout

```
apps/client   apps/server
packages/protocol  packages/game-core  packages/game-content  packages/game-rng  packages/shared-utils
tools/content-validator
ops/docker  ops/fly  ops/migrations
e2e
```

## Quick start

```bash
pnpm install
pnpm check      # typecheck + lint + test
pnpm build
pnpm dev        # run client + server in parallel (requires local Postgres + Redis)
```

## License / homage

This is a community tribute project inspired by the original Land of Devastation by Dr. Scott M. Baker. The original game and its assets remain the work of their respective authors; this rewrite is an independent reimplementation.
