import type { Config } from 'tailwindcss'
import { brand } from './src/config/brand'

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: brand.colors.primary,
        secondary: brand.colors.secondary,
        accent: brand.colors.accent,
        ink: {
          DEFAULT: '#1F2937',
          muted: '#6B7280',
          subtle: '#9CA3AF',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F6F8FA',
          border: '#E5E9EF',
        },
        success: '#16A34A',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: [
          brand.font.family,
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Tahoma',
          'sans-serif',
        ],
      },
      spacing: {
        // مقیاس‌های نیم‌پله‌ای که در Tailwind پیش‌فرض نیستند
        '4.5': '1.125rem',
        13: '3.25rem',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 42, 67, 0.04), 0 8px 24px -12px rgba(15, 42, 67, 0.12)',
        float: '0 12px 40px -16px rgba(15, 42, 67, 0.28)',
      },
      maxWidth: {
        container: '1280px',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        marquee: 'marquee 28s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
