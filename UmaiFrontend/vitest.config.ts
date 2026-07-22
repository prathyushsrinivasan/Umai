import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Separate from vite.config.ts so the dev-server proxy config, which reads env and
// would otherwise run during tests, stays out of the test environment.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
