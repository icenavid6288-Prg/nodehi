import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// فرانت‌اند روی 5173 و API لاراول روی 8000. پروکسی باعث می‌شود فراخوانی‌ها
// هم‌مبدأ باشند و CORS در توسعه دردسر نسازد.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
