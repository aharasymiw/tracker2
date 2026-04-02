# Kindred

Kindred is a secure, local-first cannabis tracking PWA built for private reflection and gradual reduction. The app runs entirely in the browser, stores encrypted data locally in IndexedDB, and can be deployed as static files on Cloudflare Pages.

## Core ideas

- All persistent user data is encrypted client-side before it is written to storage.
- The app defaults to a fast `Log` flow so capturing use takes only a few taps.
- Insights focus on patterns, pacing, and intention alignment instead of shame.
- Backups are encrypted export files that users manage themselves.

## Stack

- React 19
- TypeScript 6
- Tailwind CSS 4
- shadcn preset configuration with CSS variables
- Vite+
- Zod
- IndexedDB via `idb`
- Playwright for E2E

## Scripts

```bash
npm install
npm run dev
npm run build
npm run check
npm test
npm run test:e2e
```

## Security notes

- Password vaults use PBKDF2 plus AES-GCM to wrap the local data key.
- Device unlock uses WebAuthn passkeys only when the browser exposes the secure PRF flow needed to derive a local secret client-side.
- The service worker caches only the app shell and static assets. It never stores decrypted user data.

## Deployment

Build the static bundle and deploy the generated `dist` directory to Cloudflare Pages.
