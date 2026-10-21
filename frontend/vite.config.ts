import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// فرانت‌اند روی 5173 و API لاراول روی 8000. پروکسی باعث می‌شود فراخوانی‌ها
// هم‌مبدأ باشند و CORS در توسعه دردسر نسازد.
// میزبان‌های مجاز پیش‌نمایش (کاما-جدا) از محیط خوانده می‌شوند تا نام میزبان
// موقت در فایل ردیابی‌شده ننشیند. بدون این، Vite درخواست با Host ناشناس را
// با ۴۰۳ رد می‌کند.
const allowedHosts = (process.env.VITE_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    ...(allowedHosts.length > 0 ? { allowedHosts } : {}),
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
