import { defineConfig } from 'vitest/config'
import path from 'path'

// Separate from vite.config.ts so tests don't load the Start/Nitro plugins.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
