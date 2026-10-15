import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { config } from 'dotenv'

// Server-side env for local dev. app/.env.local wins over the repo-root
// .env.local written by `neon link`. Vercel provides env vars directly.
config({ path: ['.env.local', '../.env.local'], quiet: true })

// Ingestion cron jobs (UTC). Vercel Hobby fires anywhere within the scheduled
// hour, so jobs that depend on each other get their own hours to keep the
// order. Season stats start at 12:00 because MoneyPuck publishes last night's
// data around 10:30 UTC. ESPN runs at 9 AM and 5 PM Eastern (daylight time;
// an hour earlier in winter), the morning run before projections. The
// catch-up re-runs any daily job that failed or didn't run. Each job is
// idempotent, so a late or skipped run self-corrects next time.
const crons = [
  { path: '/api/cron/schedule', schedule: '0 11 * * *' },
  { path: '/api/cron/season-stats', schedule: '0 12 * * *' },
  { path: '/api/cron/shots', schedule: '0 13 * * *' },
  { path: '/api/cron/espn-morning', schedule: '0 13 * * *' },
  { path: '/api/cron/derived', schedule: '0 14 * * *' },
  { path: '/api/cron/game-scores', schedule: '0 15 * * *' },
  { path: '/api/cron/projections', schedule: '0 16 * * *' },
  { path: '/api/cron/bios', schedule: '0 17 * * 0' },
  { path: '/api/cron/history', schedule: '0 18 * * 0' },
  { path: '/api/cron/espn-evening', schedule: '0 21 * * *' },
  { path: '/api/cron/catch-up', schedule: '0 22 * * *' },
]

// https://tanstack.com/start/latest/docs/framework/react/guide/hosting
export default defineConfig({
  plugins: [
    tanstackStart(),
    nitro({
      vercel: {
        config: { version: 3, crons },
        // Vercel Hobby allows up to 300s per function invocation.
        functionRules: { '/api/cron/**': { maxDuration: 300 } },
      },
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Fontsource's package exports only expose CSS; this reaches the font
      // files so the root route can preload them.
      '@fontsource-files': path.resolve(__dirname, './node_modules/@fontsource-variable'),
    },
  },
})
