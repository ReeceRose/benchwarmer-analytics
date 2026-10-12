# Deploy notes

How the TypeScript app is deployed (Phase 4 of `MIGRATION_PLAN.md`).

## Vercel project

| Setting | Value |
|---|---|
| Project | `reeceroses-projects/benchwarmer-analytics` |
| Root Directory | `app` |
| Framework preset | Other (the build emits Build Output API v3 in `app/.vercel/output`) |
| Install / build | `npm ci` / `npm run build` |
| Node | 24.x (also pinned by `engines` in `app/package.json`; Nitro derives the function runtime from the build's Node version) |
| Plan | Hobby |

The build produces two functions: `__server` (UI shell + `/api/*`) and
`api/cron/[...]` (`/api/cron/*`, `maxDuration: 300`). Cron schedules and the
cron `maxDuration` come from `app/vite.config.ts`; there is no `vercel.json`.

Deploys come from the GitHub integration: pull requests get preview
deployments and merges to `main` deploy production. Production is served at
`benchwarmer.reecerose.com` (Cloudflare DNS, CNAME to Vercel, DNS only) and
`benchwarmer-analytics.vercel.app`.

Manual CLI deploys run from the repo root (`npx vercel@latest deploy`), not
from `app/`. The CLI doesn't apply `.gitignore`, so the root `.vercelignore`
limits the upload to `app/` minus local build output and env files.

## Environment variables

Production and Preview both point at the Neon `production` branch
(project `odd-paper-57411301`). All are stored as sensitive.

| Var | Value |
|---|---|
| `DATABASE_URL` | pooled (`-pooler`) connection string, used by request handlers (neon-http) |
| `DATABASE_URL_UNPOOLED` | direct connection string, used by cron/ingestion (node-postgres) |
| `CRON_SECRET` | random 32 bytes, different per environment |

Vercel Cron only calls production deployments. Preview cron routes run only
when called by hand with the preview `CRON_SECRET`, and they write to the
production database (every step is idempotent).

## Hobby plan limits

| Limit | Hobby | Effect here |
|---|---|---|
| Cron frequency | once a day per job | All jobs are daily or weekly |
| Cron precision | anywhere within the scheduled hour | The 09:00-09:45 stagger isn't guaranteed; steps tolerate any order |
| Function duration | 300 s | Slowest step is a full-season `shots` run (~85 s); nightly runs take seconds |
| Usage | non-commercial only | Move to Pro if the site becomes commercial |

Nothing currently requires Pro.

## Caching

Vercel's CDN honors `s-maxage`/`stale-while-revalidate` from API responses
and strips them from the header sent to browsers, so clients see
`Cache-Control: public, max-age=0`. Check caching with the `x-vercel-cache`
response header (`HIT`/`STALE`/`MISS`). Errors and `/api/health` are
`no-store`.

## Database migrations

Not run by the deploy. Apply them before deploying code that needs them:

```bash
cd app && npm run db:migrate   # uses DATABASE_URL_UNPOOLED from .env.local
```

## Rollback

- Bad deploy: `npx vercel@latest rollback` (or promote an earlier deployment
  in the dashboard). Crons follow the production deployment.
- Stop ingestion: Project Settings → Cron Jobs → Disable.
- There is no older stack to fall back to: the Fly app, the Azure Static Web
  App and the old Neon project have been deleted.
