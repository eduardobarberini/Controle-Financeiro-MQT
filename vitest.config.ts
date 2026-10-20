import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'supabase/functions/_shared/**/*.test.ts'],
    environment: 'node',
  },
})
