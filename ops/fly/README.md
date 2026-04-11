# Deploy targets

The **server** (`apps/server`) deploys to [Fly.io](https://fly.io) as the
`lod-server` app. Configuration lives in `ops/fly/fly.toml` and the container
image is built from `ops/docker/Dockerfile.server`. Deploys are driven by the
`deploy-server` job in `.github/workflows/deploy.yml`, which runs on every push
to `main` and shells out to `flyctl deploy`. Runtime secrets (`DATABASE_URL`,
`REDIS_URL`, `SESSION_SECRET`, `ARGON2_PEPPER`) must be set once with
`fly secrets set KEY=value --app lod-server` — they are intentionally not
committed to the repository.

The **client** (`apps/client`) does **not** deploy to Fly. Instead it is built
as a static bundle (`apps/client/dist`) and published to
[Cloudflare Pages](https://pages.cloudflare.com) under the `lod-client`
project. That deploy is handled by the `deploy-client` job in
`.github/workflows/deploy.yml`, which uses the `cloudflare/pages-action`
GitHub Action along with the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
repository secrets. There is no `fly.client.toml`; this README exists so nobody
goes looking for one.
