import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const frontendModules = fileURLToPath(new URL('./frontend/node_modules', import.meta.url))

export default defineConfig({
  resolve: {
    // react در frontend/node_modules نصب است؛ تست‌های ریشه همان را می‌بینند.
    alias: {
      'react-dom/server': `${frontendModules}/react-dom/server.js`,
      react: frontendModules + '/react',
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // تست خروجی پررندر شامل build کامل vite است و زمان می‌برد.
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
})
