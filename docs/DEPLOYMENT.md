# Land of Devastation — Deployment Guide

> A step-by-step guide for deploying LOD to production. No prior DevOps
> experience required. Estimated time: 45–60 minutes.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        YOUR BROWSER                                │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │              LOD Client (React + PixiJS)                    │   │
│   │         served from Cloudflare Pages (static)               │   │
│   └──────────────────────┬──────────────────────────────────────┘   │
│                          │                                          │
│              HTTPS + WSS │ (cross-origin)                           │
│                          ▼                                          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       FLY.IO  (iad region)                          │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │              LOD Server (Node.js + Fastify)                 │   │
│   │                                                             │   │
│   │   ┌──────────┐  ┌──────────┐  ┌────────────────────────┐   │   │
│   │   │ REST API │  │ WS Gate- │  │ GameWorld (tick loop)  │   │   │
│   │   │ (auth,   │  │ way      │  │                        │   │   │
│   │   │  chars,  │  │ (intents,│  │  ┌──────────────────┐  │   │   │
│   │   │  mail)   │  │  deltas) │  │  │ Combat Sessions  │  │   │   │
│   │   └────┬─────┘  └────┬─────┘  │  │ Presence Broker  │  │   │   │
│   │        │              │        │  │ Fortress Manager │  │   │   │
│   │        └──────┬───────┘        │  └──────────────────┘  │   │   │
│   │               │                └───────────┬────────────┘   │   │
│   │               │                            │                │   │
│   └───────────────┼────────────────────────────┼────────────────┘   │
│                   │                            │                    │
└───────────────────┼────────────────────────────┼────────────────────┘
                    │                            │
        ┌───────────┼────────────────────────────┼───────────┐
        │           ▼                            ▼           │
        │   ┌──────────────┐           ┌──────────────┐      │
        │   │  Neon         │           │  Upstash     │      │
        │   │  (Postgres)   │           │  (Redis)     │      │
        │   │              │           │              │      │
        │   │  • users     │           │  • sessions  │      │
        │   │  • characters│           │  • rate limits│      │
        │   │  • combat    │           │  • pub/sub   │      │
        │   │  • inventory │           │              │      │
        │   │  • fortresses│           │              │      │
        │   │  • mail      │           │              │      │
        │   └──────────────┘           └──────────────┘      │
        │           MANAGED DATABASES                        │
        └────────────────────────────────────────────────────┘
```

## Cost Estimate

```
┌───────────────────────┬──────────┬────────────────────────────────┐
│ Service               │ Monthly  │ Notes                          │
├───────────────────────┼──────────┼────────────────────────────────┤
│ Fly.io (server)       │ ~$3–5   │ shared-cpu-1x, 512 MB, always-on│
│ Neon (Postgres)       │ Free    │ 0.5 GB storage, auto-suspend    │
│ Upstash (Redis)       │ Free    │ 10k commands/day                │
│ Cloudflare Pages      │ Free    │ 500 builds/month                │
├───────────────────────┼──────────┼────────────────────────────────┤
│ TOTAL                 │ ~$3–5   │                                 │
└───────────────────────┴──────────┴────────────────────────────────┘
```

## What You Need Before Starting

```
  ┌─────────────────────────────────────────────────┐
  │              PREREQUISITES CHECKLIST             │
  ├─────────────────────────────────────────────────┤
  │                                                 │
  │  [ ] GitHub account with push access to repo    │
  │  [ ] Node.js 22.x installed                     │
  │  [ ] pnpm 9.x installed                         │
  │  [ ] git installed, repo cloned                 │
  │  [ ] Credit card (free tiers require one)       │
  │  [ ] Password manager open (for ~6 secrets)     │
  │                                                 │
  └─────────────────────────────────────────────────┘
```

Verify your local setup works before touching any website:

```bash
node --version    # should print v22.x.x
pnpm --version    # should print 9.x.x
git --version     # any recent version

cd ~/tracker2
pnpm install
pnpm check        # must be green before deploying
```

If `pnpm check` fails, fix local issues first — deploying broken code wastes time.

---

## Setup Flow

This guide walks through 9 steps in order. Here's the big picture:

```
 Step 1          Step 2          Step 3          Step 4          Step 5
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Create   │   │ Generate │   │ Run DB   │   │ Deploy   │   │ Deploy   │
│ accounts │──▶│ secrets  │──▶│ migration│──▶│ server   │──▶│ client   │
│ (4 sites)│   │ locally  │   │ to Neon  │   │ to Fly   │   │ to CF    │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
                                                                 │
 Step 9          Step 8          Step 7          Step 6           │
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐       │
│ Day-2    │   │ Verify   │   │ Wire up  │   │ Connect  │◀──────┘
│ ops      │◀──│ every-   │◀──│ auto-    │◀──│ CORS     │
│ (ref)    │   │ thing    │   │ deploy   │   │ origins  │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
```

---

## Step 1 — Create Accounts

Create all four accounts first. Use the **same email** for all of them.

### Step 1a — Neon (Postgres Database)

Neon gives you a serverless Postgres database on their free tier.

```
  ┌──────────────────────────────────────────────────────────────┐
  │                    https://neon.tech                          │
  │                                                              │
  │   ┌────────────────────────────────────────────────────┐     │
  │   │                                                    │     │
  │   │          Click  [ Sign up ]                        │     │
  │   │                                                    │     │
  │   │          Choose "Continue with GitHub"             │     │
  │   │                                                    │     │
  │   │          Plan:   ● Free                            │     │
  │   │                                                    │     │
  │   └────────────────────────────────────────────────────┘     │
  │                                                              │
  │   Onboarding wizard appears:                                 │
  │                                                              │
  │   ┌────────────────────────────────────────────────────┐     │
  │   │                                                    │     │
  │   │   Project name:    [ lod-prod              ]       │     │
  │   │                                                    │     │
  │   │   Region:          [ AWS us-east-1 (N. Virginia) ▼]│     │
  │   │                    or  AWS us-east-2 (Ohio)        │     │
  │   │                    (pick whichever is closest      │     │
  │   │                     to Fly.io's "iad" region)      │     │
  │   │                                                    │     │
  │   │                  [ Create project ]                 │     │
  │   │                                                    │     │
  │   └────────────────────────────────────────────────────┘     │
  │                                                              │
  │   After creation, Neon shows your connection string:         │
  │                                                              │
  │   ┌────────────────────────────────────────────────────┐     │
  │   │                                                    │     │
  │   │   Connection string:                               │     │
  │   │                                                    │     │
  │   │   ┌──────────────────────────────────────────┐     │     │
  │   │   │ Pooled connection  ← USE THIS ONE        │     │     │
  │   │   │                                          │     │     │
  │   │   │ postgresql://user:pass@ep-xxxx-          │     │     │
  │   │   │ pooler.us-east-2.aws.neon.tech/          │     │     │
  │   │   │ neondb?sslmode=require                   │     │     │
  │   │   └──────────────────────────────────────────┘     │     │
  │   │                                                    │     │
  │   │   ⚠  Copy the "Pooled connection" string.          │     │
  │   │      The hostname must contain "-pooler".          │     │
  │   │                                                    │     │
  │   │   Save in your password manager as: DATABASE_URL   │     │
  │   │                                                    │     │
  │   └────────────────────────────────────────────────────┘     │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### Step 1b — Upstash (Redis)

Upstash gives you a serverless Redis instance on their free tier.

```
  ┌──────────────────────────────────────────────────────────────┐
  │                   https://upstash.com                        │
  │                                                              │
  │   ┌────────────────────────────────────────────────────┐     │
  │   │                                                    │     │
  │   │          Click  [ Sign In with GitHub ]            │     │
  │   │                                                    │     │
  │   │          Accept the free tier                      │     │
  │   │                                                    │     │
  │   └────────────────────────────────────────────────────┘     │
  │                                                              │
  │   Top-right corner → click [ Create Database ]               │
  │                                                              │
  │   ┌────────────────────────────────────────────────────┐     │
  │   │                                                    │     │
  │   │   Name:     [ lod-prod                     ]       │     │
  │   │                                                    │     │
  │   │   Primary Region:                                  │     │
  │   │             [ N. Virginia (us-east-1)      ▼]      │     │
  │   │                                                    │     │
  │   │   Type:     ● Regional                             │     │
  │   │                                                    │     │
  │   │   Eviction: ☑  Enabled                             │     │
  │   │                                                    │     │
  │   │                  [ Create ]                         │     │
  │   │                                                    │     │
  │   └────────────────────────────────────────────────────┘     │
  │                                                              │
  │   On the database detail page:                               │
  │                                                              │
  │   ┌────────────────────────────────────────────────────┐     │
  │   │                                                    │     │
  │   │   Connect to your database                         │     │
  │   │                                                    │     │
  │   │   Tab: [ Node.js (ioredis) ]                       │     │
  │   │                                                    │     │
  │   │   ┌──────────────────────────────────────────┐     │     │
  │   │   │ rediss://default:abc123@us1-             │     │     │
  │   │   │ lovely-fish-12345.upstash.io:6379        │     │     │
  │   │   └──────────────────────────────────────────┘     │     │
  │   │                                                    │     │
  │   │   ⚠  Note the double 's' in "rediss://"           │     │
  │   │      That means TLS. It is required.               │     │
  │   │                                                    │     │
  │   │   Save in your password manager as: REDIS_URL      │     │
  │   │                                                    │     │
  │   └────────────────────────────────────────────────────┘     │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### Step 1c — Fly.io (Server Host)

Fly.io runs the game server in a Docker container close to your databases.

```
  ┌──────────────────────────────────────────────────────────────┐
  │                     https://fly.io                           │
  │                                                              │
  │   ┌────────────────────────────────────────────────────┐     │
  │   │                                                    │     │
  │   │          Click  [ Sign up ]                        │     │
  │   │                                                    │     │
  │   │          Choose "Sign in with GitHub"              │     │
  │   │                                                    │     │
  │   │          Enter credit card when prompted           │     │
  │   │          (required, but free tier covers us)       │     │
  │   │                                                    │     │
  │   │          Keep default org name                     │     │
  │   │                                                    │     │
  │   └────────────────────────────────────────────────────┘     │
  │                                                              │
  │   ⚠  You'll do the rest of Fly from the terminal,           │
  │      not the web dashboard. Keep this tab open.              │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### Step 1d — Cloudflare (Client Host)

Cloudflare Pages serves the static React client bundle for free.

```
  ┌──────────────────────────────────────────────────────────────┐
  │              https://dash.cloudflare.com/sign-up             │
  │                                                              │
  │   ┌────────────────────────────────────────────────────┐     │
  │   │                                                    │     │
  │   │          Create account                            │     │
  │   │                                                    │     │
  │   │          Verify your email                         │     │
  │   │                                                    │     │
  │   │          You do NOT need to add a domain yet       │     │
  │   │                                                    │     │
  │   └────────────────────────────────────────────────────┘     │
  │                                                              │
  │   Keep this tab open — you'll come back in Step 5.           │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### Account Summary

At this point you should have four accounts and two secrets saved:

```
  ┌──────────────────────────────────────────────────────────────┐
  │                     ACCOUNTS CREATED                         │
  │                                                              │
  │   ✓  Neon        → DATABASE_URL saved                       │
  │   ✓  Upstash     → REDIS_URL saved                         │
  │   ✓  Fly.io      → account ready (CLI next)                │
  │   ✓  Cloudflare  → account ready (dashboard next)          │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

---

## Step 2 — Generate Application Secrets

The server needs two cryptographic secrets that you generate locally.
**Never commit these to git.**

```bash
# Run these two commands in any terminal:

openssl rand -base64 48    # → save as SESSION_SECRET
openssl rand -base64 48    # → save as PASSWORD_PEPPER
```

```
  ┌──────────────────────────────────────────────────────────────┐
  │               PASSWORD MANAGER — save these                  │
  │                                                              │
  │   DATABASE_URL      postgresql://user:pass@...neon.tech/...  │
  │   REDIS_URL         rediss://default:...@...upstash.io:6379  │
  │   SESSION_SECRET    <first openssl output>                   │
  │   PASSWORD_PEPPER   <second openssl output>                  │
  │                                                              │
  │   ⚠  The server REFUSES to boot in production if any of     │
  │      these are left at their development defaults.           │
  │      (Enforced by env.ts superRefine validation)             │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

---

## Step 3 — Run Database Migrations

Drizzle migrations create the tables (`users`, `characters`, `inventory_items`,
etc.) in your Neon database.

```bash
# From the repo root:

export DATABASE_URL='<paste the Neon pooled URL from Step 1a>'

pnpm --filter @lod/server db:migrate
```

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │   Expected output:                                           │
  │                                                              │
  │   $ pnpm --filter @lod/server db:migrate                     │
  │                                                              │
  │   ┌──────────────────────────────────────────────────┐       │
  │   │  [drizzle] Applying migration 0001_initial...    │       │
  │   │  [drizzle] Migration 0001_initial applied ✓      │       │
  │   │  [drizzle] All migrations applied successfully   │       │
  │   └──────────────────────────────────────────────────┘       │
  │                                                              │
  │   If you get an SSL error, make sure your DATABASE_URL       │
  │   ends with  ?sslmode=require                                │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

After the migration succeeds, clear the variable so it doesn't leak:

```bash
unset DATABASE_URL
```

---

## Step 4 — Deploy Server to Fly.io

This is the longest step. It uses the `flyctl` CLI to configure and deploy the
game server.

### 4a — Install flyctl

```bash
# macOS:
brew install flyctl

# Linux:
curl -L https://fly.io/install.sh | sh

# Windows:
iwr https://fly.io/install.ps1 -useb | iex
```

### 4b — Log in

```bash
fly auth login
# Opens a browser — log in with GitHub
```

### 4c — Create the app (without deploying yet)

```bash
fly launch \
  --config ops/fly/fly.toml \
  --dockerfile ops/docker/Dockerfile.server \
  --copy-config \
  --no-deploy
```

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │   flyctl will ask you two questions:                         │
  │                                                              │
  │   "Would you like to copy its configuration                  │
  │    to the new app?"                                          │
  │                                                              │
  │        Answer:  Yes                                          │
  │                                                              │
  │   "Would you like to set up a Postgresql /                   │
  │    Redis database?"                                          │
  │                                                              │
  │        Answer:  No   (we're using Neon and Upstash)          │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### 4d — Set secrets

This is critical — the server will not boot without these.

```bash
fly secrets set \
  DATABASE_URL='<Neon pooled URL from Step 1a>' \
  REDIS_URL='<Upstash rediss:// URL from Step 1b>' \
  SESSION_SECRET='<from Step 2>' \
  PASSWORD_PEPPER='<from Step 2>' \
  NODE_ENV=production \
  LOG_LEVEL=info \
  --app lod-server
```

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │              WHAT EACH SECRET DOES                           │
  │                                                              │
  │  ┌────────────────┬──────────────────────────────────────┐   │
  │  │ DATABASE_URL   │ Postgres connection for all game     │   │
  │  │                │ data: users, characters, combat,     │   │
  │  │                │ inventory, fortresses, mail           │   │
  │  ├────────────────┼──────────────────────────────────────┤   │
  │  │ REDIS_URL      │ Redis for sessions, rate limiting,   │   │
  │  │                │ and pub/sub (future sharding)         │   │
  │  ├────────────────┼──────────────────────────────────────┤   │
  │  │ SESSION_SECRET │ Encrypts HttpOnly session cookies    │   │
  │  │                │ (must be ≥ 32 characters)             │   │
  │  ├────────────────┼──────────────────────────────────────┤   │
  │  │ PASSWORD_PEPPER│ Extra layer on top of Argon2id       │   │
  │  │                │ password hashes (≥ 16 characters)     │   │
  │  ├────────────────┼──────────────────────────────────────┤   │
  │  │ NODE_ENV       │ "production" — activates security    │   │
  │  │                │ guards that block dev defaults        │   │
  │  ├────────────────┼──────────────────────────────────────┤   │
  │  │ LOG_LEVEL      │ "info" — structured JSON logs        │   │
  │  │                │ via Pino                              │   │
  │  └────────────────┴──────────────────────────────────────┘   │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### 4e — Deploy

```bash
fly deploy \
  --config ops/fly/fly.toml \
  --dockerfile ops/docker/Dockerfile.server
```

This builds the Docker image remotely on Fly's builders and starts the machine.
It typically takes 2–4 minutes.

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │   What happens during deploy:                                │
  │                                                              │
  │   1. Fly uploads your repo to a remote builder               │
  │   2. Docker builds the multi-stage image:                    │
  │      ┌──────────────────────────────────────────┐            │
  │      │  Stage 1 (builder)                       │            │
  │      │  • pnpm install --frozen-lockfile         │            │
  │      │  • Build all packages                     │            │
  │      │  • Build server                           │            │
  │      │  • pnpm deploy --prod (prune deps)        │            │
  │      ├──────────────────────────────────────────┤            │
  │      │  Stage 2 (runner)                        │            │
  │      │  • Copy only prod node_modules + dist     │            │
  │      │  • Run as non-root 'node' user            │            │
  │      │  • Expose port 4000                       │            │
  │      │  • HEALTHCHECK via /health                │            │
  │      └──────────────────────────────────────────┘            │
  │   3. Fly starts the machine in the 'iad' region              │
  │   4. Health check passes → deploy marked successful          │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### 4f — Verify

```bash
curl https://lod-server.fly.dev/health
```

Expected response:

```json
{ "status": "ok" }
```

If it fails, check the logs:

```bash
fly logs --app lod-server
```

---

## Step 5 — Deploy Client to Cloudflare Pages

This step uses the **Cloudflare dashboard** (web UI), not a CLI.

### 5a — Navigate to Pages

```
  ┌──────────────────────────────────────────────────────────────┐
  │              https://dash.cloudflare.com                     │
  │                                                              │
  │   Left sidebar:                                              │
  │                                                              │
  │   ┌──────────────────┐                                       │
  │   │  Home            │                                       │
  │   │  Websites        │                                       │
  │   │  ► Workers &     │ ◀── Click this                       │
  │   │    Pages         │                                       │
  │   │  ...             │                                       │
  │   └──────────────────┘                                       │
  │                                                              │
  │   Then click:  [ Create ]  →  [ Pages ] tab                  │
  │                                                              │
  │   Then click:  [ Connect to Git ]                            │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### 5b — Authorize GitHub

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │   Cloudflare asks to install its GitHub app.                 │
  │                                                              │
  │   ⚠  Scope it to ONLY the tracker2 repository,              │
  │      not all repos:                                          │
  │                                                              │
  │   ┌──────────────────────────────────────────────────┐       │
  │   │                                                  │       │
  │   │  Repository access:                              │       │
  │   │                                                  │       │
  │   │    ○  All repositories                           │       │
  │   │    ●  Only select repositories                   │       │
  │   │                                                  │       │
  │   │       [  aharasymiw/tracker2        ▼]           │       │
  │   │                                                  │       │
  │   └──────────────────────────────────────────────────┘       │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### 5c — Select Repository

Select `aharasymiw/tracker2` and click **Begin setup**.

### 5d — Configure Build Settings

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │   ┌──────────────────────────────────────────────────────┐   │
  │   │                                                      │   │
  │   │  Project name:                                       │   │
  │   │  [ lod-client                                    ]   │   │
  │   │                                                      │   │
  │   │  Production branch:                                  │   │
  │   │  [ main                                          ]   │   │
  │   │                                                      │   │
  │   │  Framework preset:                                   │   │
  │   │  [ None                                          ▼]  │   │
  │   │                                                      │   │
  │   │  ⚠  Do NOT pick "Vite" — the monorepo build         │   │
  │   │     command differs from a standard Vite project     │   │
  │   │                                                      │   │
  │   │  Build command:                                      │   │
  │   │  ┌──────────────────────────────────────────────┐    │   │
  │   │  │ pnpm install --frozen-lockfile &&            │    │   │
  │   │  │ pnpm -r --filter=./packages/** build &&      │    │   │
  │   │  │ pnpm --filter @lod/client build              │    │   │
  │   │  └──────────────────────────────────────────────┘    │   │
  │   │                                                      │   │
  │   │  Build output directory:                             │   │
  │   │  [ apps/client/dist                              ]   │   │
  │   │                                                      │   │
  │   │  Root directory (path):                              │   │
  │   │  [ (leave blank)                                 ]   │   │
  │   │                                                      │   │
  │   └──────────────────────────────────────────────────────┘   │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### 5e — Add Environment Variables

Under **Environment variables (build & preview)**, click **Add variable** twice:

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │   Environment variables (build & preview):                   │
  │                                                              │
  │   ┌────────────────────┬─────────────────────────────────┐   │
  │   │ Variable name      │ Value                           │   │
  │   ├────────────────────┼─────────────────────────────────┤   │
  │   │ VITE_API_URL       │ https://lod-server.fly.dev      │   │
  │   ├────────────────────┼─────────────────────────────────┤   │
  │   │ VITE_WS_URL        │ wss://lod-server.fly.dev        │   │
  │   └────────────────────┴─────────────────────────────────┘   │
  │                                                              │
  │   These tell the client where the server lives.              │
  │   Vite inlines them at build time (they are NOT secrets).    │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### 5f — Deploy

Click **Save and Deploy**. The first build takes 3–5 minutes.

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │   When the build finishes, Cloudflare gives you a URL:       │
  │                                                              │
  │   ┌──────────────────────────────────────────────────┐       │
  │   │                                                  │       │
  │   │   ✓  Build successful!                           │       │
  │   │                                                  │       │
  │   │   Your site is live at:                          │       │
  │   │                                                  │       │
  │   │   https://lod-client.pages.dev                   │       │
  │   │                                                  │       │
  │   └──────────────────────────────────────────────────┘       │
  │                                                              │
  │   Save this URL — you'll need it in Step 6.                  │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

---

## Step 6 — Connect Client and Server (CORS)

The client (Cloudflare) and server (Fly) are on different origins, so the
server must explicitly allow the client's origin.

```bash
fly secrets set \
  CORS_ORIGIN='https://lod-client.pages.dev' \
  --app lod-server
```

Fly will restart the machine automatically.

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │             HOW THE PIECES CONNECT                           │
  │                                                              │
  │   Browser                                                    │
  │   ┌─────────────────────────────┐                            │
  │   │  https://lod-client.        │                            │
  │   │  pages.dev                  │                            │
  │   │                             │   HTTPS / WSS              │
  │   │  fetch("/api/auth/login")  ─┼─────────────────┐          │
  │   │  new WebSocket("/ws")      ─┼──────────────┐  │          │
  │   └─────────────────────────────┘              │  │          │
  │                                                │  │          │
  │   Fly.io                                       │  │          │
  │   ┌─────────────────────────────┐              │  │          │
  │   │  https://lod-server.        │◀─────────────┘  │          │
  │   │  fly.dev                    │◀────────────────┘          │
  │   │                             │                            │
  │   │  CORS allows:               │                            │
  │   │  lod-client.pages.dev  ✓    │                            │
  │   │  evil-site.com         ✗    │                            │
  │   └─────────────────────────────┘                            │
  │                                                              │
  │   ⚠  CORS_ORIGIN must match EXACTLY — no trailing slash.    │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### Quick Test

Open `https://lod-client.pages.dev` in your browser. Open DevTools → **Network**
tab. Try registering a character. You should see:

- `/api/auth/register` → `201` (not a CORS error)
- `/ws` → `101 Switching Protocols`

If you see CORS errors, double-check the `CORS_ORIGIN` value matches exactly.

---

## Step 7 — Wire Up Auto-Deploy (GitHub Actions)

Your repo already has `.github/workflows/deploy.yml` that runs on every push
to `main`. You just need to give GitHub three secrets.

### 7a — Get a Fly API Token

```bash
fly tokens create deploy --app lod-server
```

Copy the output (starts with `FlyV1 fm2_...`).

### 7b — Get a Cloudflare API Token

```
  ┌──────────────────────────────────────────────────────────────┐
  │              https://dash.cloudflare.com                     │
  │                                                              │
  │   Top-right profile icon → [ My Profile ]                    │
  │                                                              │
  │   Left sidebar → [ API Tokens ]                              │
  │                                                              │
  │   Click  [ Create Token ]                                    │
  │                                                              │
  │   ┌──────────────────────────────────────────────────────┐   │
  │   │                                                      │   │
  │   │  Template:  Custom token                             │   │
  │   │                                                      │   │
  │   │  Permissions:                                        │   │
  │   │  ┌───────────────┬──────────────────┬────────────┐   │   │
  │   │  │ Account       │ Cloudflare Pages │ Edit       │   │   │
  │   │  ├───────────────┼──────────────────┼────────────┤   │   │
  │   │  │ User          │ User Details     │ Read       │   │   │
  │   │  └───────────────┴──────────────────┴────────────┘   │   │
  │   │                                                      │   │
  │   │  Account Resources:  your account only               │   │
  │   │                                                      │   │
  │   │  Click  [ Continue to summary ]                      │   │
  │   │  Click  [ Create Token ]                             │   │
  │   │                                                      │   │
  │   │  Copy the token (shown only once!)                   │   │
  │   │                                                      │   │
  │   └──────────────────────────────────────────────────────┘   │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### 7c — Get your Cloudflare Account ID

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │   Cloudflare dashboard → Workers & Pages                     │
  │                                                              │
  │   Right sidebar shows:                                       │
  │                                                              │
  │   ┌──────────────────────────────────────────┐               │
  │   │  Account ID                              │               │
  │   │  a1b2c3d4e5f6...   [ Copy ]              │               │
  │   └──────────────────────────────────────────┘               │
  │                                                              │
  │   It's a 32-character hex string.                            │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### 7d — Add Secrets to GitHub

```
  ┌──────────────────────────────────────────────────────────────┐
  │  https://github.com/aharasymiw/tracker2/settings/            │
  │  secrets/actions                                             │
  │                                                              │
  │  Click  [ New repository secret ]  three times:              │
  │                                                              │
  │  ┌────────────────────────┬──────────────────────────────┐   │
  │  │ Secret name            │ Value                        │   │
  │  ├────────────────────────┼──────────────────────────────┤   │
  │  │ FLY_API_TOKEN          │ FlyV1 fm2_... (from 7a)     │   │
  │  ├────────────────────────┼──────────────────────────────┤   │
  │  │ CLOUDFLARE_API_TOKEN   │ token from 7b               │   │
  │  ├────────────────────────┼──────────────────────────────┤   │
  │  │ CLOUDFLARE_ACCOUNT_ID  │ 32-char hex from 7c         │   │
  │  └────────────────────────┴──────────────────────────────┘   │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### Test Auto-Deploy

Push any trivial commit to `main`. Both deploy jobs should run green:

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │   GitHub Actions → Deploy workflow                           │
  │                                                              │
  │   ┌──────────────────────────────────────────────┐           │
  │   │                                              │           │
  │   │  ✓  Deploy server to Fly.io        2m 34s    │           │
  │   │  ✓  Deploy client to Cloudflare    3m 12s    │           │
  │   │                                              │           │
  │   └──────────────────────────────────────────────┘           │
  │                                                              │
  │   From now on, every merge to main auto-deploys both.        │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

---

## Step 8 — Verify Everything

Work through this checklist top to bottom. Each line is independent.

```
  ┌──────────────────────────────────────────────────────────────┐
  │                   VERIFICATION CHECKLIST                     │
  │                                                              │
  │  Server:                                                     │
  │  [ ] curl https://lod-server.fly.dev/health                  │
  │      returns {"status":"ok"}                                 │
  │                                                              │
  │  [ ] fly logs --app lod-server                               │
  │      shows "server listening on 0.0.0.0:4000"               │
  │      with no error traces                                    │
  │                                                              │
  │  [ ] fly status --app lod-server                             │
  │      shows 1 machine in "started" state, region "iad"        │
  │                                                              │
  │  Client:                                                     │
  │  [ ] https://lod-client.pages.dev loads the React app        │
  │      with no console errors                                  │
  │                                                              │
  │  [ ] Register a character from the UI — succeeds             │
  │                                                              │
  │  [ ] Refresh the page — still logged in                      │
  │      (session cookie works)                                  │
  │                                                              │
  │  Connectivity:                                               │
  │  [ ] DevTools → Network shows WebSocket to                   │
  │      wss://lod-server.fly.dev/ws                             │
  │      status: 101 Switching Protocols, staying open           │
  │                                                              │
  │  Database:                                                   │
  │  [ ] Neon console → Tables:                                  │
  │      users and characters tables exist                       │
  │      and contain your test row                               │
  │                                                              │
  │  Redis:                                                      │
  │  [ ] Upstash → Data Browser:                                 │
  │      at least one session:* key exists after login           │
  │                                                              │
  │  Auto-deploy:                                                │
  │  [ ] Push a trivial change to main                           │
  │      Both deploy jobs go green within ~5 minutes             │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

---

## Step 9 — Day-2 Operations Reference

Quick reference for when something breaks after deployment.

### Where to Look

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │   PROBLEM              │  WHERE TO LOOK                     │
  │  ──────────────────────┼──────────────────────────────────── │
  │                        │                                     │
  │   Server crash /       │  fly logs --app lod-server          │
  │   boot failure         │  or Fly dashboard → Monitoring      │
  │                        │                                     │
  │   Bad deploy           │  fly releases --app lod-server      │
  │                        │  Rollback:                          │
  │                        │  fly deploy --image <prev image>    │
  │                        │                                     │
  │   DB issues            │  Neon dashboard → SQL Editor        │
  │                        │  (read-only queries are safe)       │
  │                        │                                     │
  │   Redis issues         │  Upstash dashboard → Data Browser   │
  │                        │                                     │
  │   Client deploy        │  Cloudflare → Workers & Pages →     │
  │   broke something      │  lod-client → Deployments tab       │
  │                        │  Each has a "Rollback" button       │
  │                        │                                     │
  │   CI failed            │  GitHub → Actions tab               │
  │                        │  Click the failed run for logs      │
  │                        │                                     │
  └──────────────────────────────────────────────────────────────┘
```

### Common Commands

```bash
# Server logs (live tail)
fly logs --app lod-server

# Server status
fly status --app lod-server

# SSH into the running machine
fly ssh console --app lod-server

# Restart the server
fly apps restart lod-server

# List recent deploys
fly releases --app lod-server

# Scale up (if needed later)
fly scale memory 1024 --app lod-server
fly scale count 2 --app lod-server
```

### Optional: Uptime Monitoring

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │   Free uptime monitoring:                                    │
  │                                                              │
  │   1. Go to https://uptimerobot.com                           │
  │   2. Create free account                                     │
  │   3. Add monitor:                                            │
  │      • Type: HTTPS                                           │
  │      • URL: https://lod-server.fly.dev/health                │
  │      • Interval: 5 minutes                                   │
  │      • Alert: email on failure                               │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### Backups

Neon's free tier includes 7 days of point-in-time recovery (PITR) built in.
No manual backup setup needed until you outgrow the free tier.

---

## Complete Data Flow

For reference, here's how a player action flows through the entire system:

```
  Player clicks "Move East" in browser
           │
           ▼
  ┌─────────────────────┐
  │  Client (CF Pages)  │
  │                     │
  │  1. Create intent:  │
  │     { type: "Move", │
  │       direction:    │
  │       "east" }      │
  │                     │
  │  2. Wrap in         │
  │     envelope with   │
  │     seq number      │
  │                     │
  │  3. Send over WS    │
  └────────┬────────────┘
           │  WSS
           ▼
  ┌─────────────────────┐     ┌─────────────────────┐
  │  Server (Fly.io)    │     │                     │
  │                     │     │  Neon (Postgres)    │
  │  4. Zod validates   │     │                     │
  │     envelope shape  │     │  7. UPDATE          │
  │                     │     │     characters      │
  │  5. authz.ts checks │     │     SET tile_x =   │
  │     "can this char  │────▶│     tile_x + 1,    │
  │      move right     │     │     turns_remaining │
  │      now?"          │     │     = turns - 1     │
  │                     │     │     WHERE id = ...   │
  │  6. game-core       │     │                     │
  │     validates tile  │     └─────────────────────┘
  │     is passable     │
  │                     │
  │  8. Broadcast       │
  │     StateDelta to   │
  │     nearby players  │
  └────────┬────────────┘
           │  WSS
           ▼
  ┌─────────────────────┐
  │  All nearby clients │
  │                     │
  │  9. Update Zustand  │
  │     world store     │
  │                     │
  │  10. PixiJS re-     │
  │      renders the    │
  │      moved entity   │
  └─────────────────────┘
```

---

## Environment Variable Reference

All variables the server reads, from `apps/server/src/config/env.ts`:

```
  ┌────────────────────┬──────────┬───────────────────────────────┐
  │ Variable           │ Required │ Default / Notes               │
  ├────────────────────┼──────────┼───────────────────────────────┤
  │ NODE_ENV           │ No       │ "development"                 │
  │ PORT               │ No       │ 4000                          │
  │ HOST               │ No       │ "0.0.0.0"                     │
  │ DATABASE_URL       │ Yes*     │ dev default (blocked in prod) │
  │ REDIS_URL          │ Yes*     │ dev default (blocked in prod) │
  │ SESSION_SECRET     │ Yes*     │ dev default (blocked in prod) │
  │ PASSWORD_PEPPER    │ Yes*     │ dev default (blocked in prod) │
  │ CORS_ORIGIN        │ No       │ "http://localhost:5173"       │
  │ LOG_LEVEL          │ No       │ "info"                        │
  │ TICK_RATE_HZ       │ No       │ 10                            │
  ├────────────────────┴──────────┴───────────────────────────────┤
  │ * Required in production. Server refuses to boot if these    │
  │   are left at their development defaults when NODE_ENV       │
  │   is "production".                                           │
  └──────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### "Multiple versions of pnpm specified"

The CI workflow's `pnpm/action-setup@v4` auto-reads the `packageManager` field
from `package.json`. If the workflow YAML also has `with: version: 9`, the
action sees two conflicting specs. Fix: remove the `with: version` block.

### CORS errors in the browser

Verify `CORS_ORIGIN` on Fly matches the exact Pages URL (no trailing slash):

```bash
fly secrets list --app lod-server
# Check CORS_ORIGIN is set

fly secrets set CORS_ORIGIN='https://lod-client.pages.dev' --app lod-server
```

### Server won't boot — "refuse to boot in production"

One or more secrets are still set to dev defaults. Re-run `fly secrets set`
with real values for `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, and
`PASSWORD_PEPPER`.

### Database migration fails with SSL error

Make sure your `DATABASE_URL` ends with `?sslmode=require`:

```
postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
                                                                    ^^^^^^^^^^^^^^^
```

### WebSocket disconnects immediately

Check that `CORS_ORIGIN` includes the client origin AND that the client's
`VITE_WS_URL` points to `wss://lod-server.fly.dev` (note `wss://`, not `ws://`).

### Deploy workflow fails on GitHub

The two deploy jobs need three GitHub Actions secrets. Go to repo Settings →
Secrets and variables → Actions and verify all three exist:
`FLY_API_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
