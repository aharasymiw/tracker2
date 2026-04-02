# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kindred** is a local-first, encrypted cannabis tracking PWA. All data is encrypted client-side (no backend). Deployed as static files on Cloudflare Pages.

Stack: React 19 + TypeScript + Vite+ + Tailwind CSS 4 + IndexedDB + WebAuthn

## Commands

```bash
npm run dev           # Dev server on port 4173
npm run build         # Production bundle → dist/
npm run typecheck     # TypeScript validation
npm run lint          # Linting
npm run fmt           # Format code
npm run check         # Full validation (type + lint)
npm test              # Unit tests (one-shot)
npm run test:watch    # Unit tests (watch mode)
npm run test:e2e      # Playwright E2E tests (mobile Chromium)
```

Run a single test file: `npx vitest run src/path/to/file.test.ts`

## Architecture

### App State Machine (src/App.tsx)

The app is a monolithic stateful component managing all flows. Status transitions: `booting` → `onboarding` → `locked` → `ready`. Client-side routing handles views: `log`, `insights`, `goals`, `settings`.

### Security Model

Critical: never log decrypted vault contents or raw key material.

1. **Key derivation:** PBKDF2 (calibrated to ~250ms) + AES-GCM for password path; WebAuthn PRF extension for passkey path
2. **Record encryption:** Each entry/goal/intention individually encrypted with a wrapped data key
3. **Service worker:** Caches only app shell and static assets—never encrypted records or key material
4. **Backup:** Full encrypted envelope exported as JSON; user manages their own backups

### Module Layout

```
src/
├── App.tsx              # Root component (state machine, routing, all flows)
├── types/models.ts      # TypeScript interfaces
├── schemas/             # Zod validation schemas
├── crypto/              # AES-GCM, PBKDF2, WebAuthn PRF
├── storage/             # IndexedDB abstraction + vault repository
├── features/            # insights/, goals/, backup/, theme/
├── lib/                 # encoding, time, utils
└── components/          # ui/primitives.tsx, charts.tsx
```

Use `@/` alias for imports (e.g. `@/storage/db`).

### Data Models

- **EntryRecord:** Usage event (type, solo/shared, hit count, timestamp, optional note/intention)
- **GoalPlan:** Baseline days + weekly target hits
- **IntentionPlan:** Statement + optional motivation
- **AppPreferences:** Theme, reduced motion, last export timestamp

## Code Style

2-space indentation, semicolons, single quotes, trailing commas. `PascalCase` for components, `camelCase` for functions/variables, `kebab-case` for feature files (e.g. `goal-math.ts`).
