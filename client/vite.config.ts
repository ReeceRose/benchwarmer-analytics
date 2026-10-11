import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { config } from 'dotenv'

// Server-side env for local dev. client/.env.local wins over the repo-root
// .env.local written by `neon link`. Vercel provides env vars directly.
config({ path: ['.env.local', '../.env.local'], quiet: true })

// https://tanstack.com/start/latest/docs/framework/react/guide/hosting
export default defineConfig({
  plugins: [
    tanstackStart(),
    nitro(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
