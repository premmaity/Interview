import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 4173 },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: './src/test/setup.ts',
    coverage: { provider: 'v8', reporter: ['text', 'json-summary'] },
  },
})
