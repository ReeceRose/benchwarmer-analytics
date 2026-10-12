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

// Ingestion cron jobs (UTC). Staggered so each step sees the previous one's
// data; each is idempotent, so a late or skipped run self-corrects next time.
const crons = [
  { path: '/api/cron/schedule', schedule: '0 9 * * *' },
  { path: '/api/cron/season-stats', schedule: '15 9 * * *' },
  { path: '/api/cron/shots', schedule: '30 9 * * *' },
  { path: '/api/cron/derived', schedule: '45 9 * * *' },
  { path: '/api/cron/bios', schedule: '0 10 * * 0' },
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
    },
  },
})
