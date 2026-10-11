import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// client/.env.local wins over the repo-root .env.local written by `neon link`.
config({ path: ['.env.local', '../.env.local'], quiet: true })

// Migrations should use a direct (non-pooled) connection; fall back to
// DATABASE_URL for local Postgres, where there is no pooler.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
if (!url) {
  throw new Error('DATABASE_URL_UNPOOLED or DATABASE_URL must be set')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url },
  schemaFilter: ['public'],
})
