# Git hooks

This directory contains optional Git hooks for local development. They are
**not** enabled by default — Git only runs hooks from `.git/hooks/` unless you
tell it otherwise.

## Enable

Run this once per clone:

```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

After that, `git commit` will run `pnpm typecheck` and `pnpm lint` before
accepting the commit. To bypass the hook for a single commit (e.g. work in
progress), use `git commit --no-verify`.

## Disable

```bash
git config --unset core.hooksPath
```
