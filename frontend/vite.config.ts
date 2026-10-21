import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// فرانت‌اند روی 5173 و API لاراول روی 8000. پروکسی باعث می‌شود فراخوانی‌ها
// هم‌مبدأ باشند و CORS در توسعه دردسر نسازد.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // در پیش‌نمایش ابری، دامنه از متغیر محیطی می‌آید تا در فایل ردیابی‌شده
    // هارد‌کد نشود.
    allowedHosts: process.env.VITE_ALLOWED_HOSTS
      ? process.env.VITE_ALLOWED_HOSTS.split(',').map((host) => host.trim()).filter(Boolean)
      : undefined,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
