/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F2A43',
          light: '#1B4066',
          dark: '#081A2B',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#12B5A5',
          light: '#3FCFC0',
          dark: '#0B8478',
          foreground: '#04231F',
        },
        accent: {
          DEFAULT: '#FF6B35',
          light: '#FF8A5C',
          dark: '#E04E1B',
          foreground: '#FFFFFF',
        },
        ink: { DEFAULT: '#1F2937', muted: '#6B7280', subtle: '#9CA3AF' },
        surface: { DEFAULT: '#FFFFFF', muted: '#F6F8FA', border: '#E5E9EF' },
        success: '#16A34A',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', '-apple-system', 'Segoe UI', 'Tahoma', 'sans-serif'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.25rem' },
      boxShadow: {
        card: '0 1px 2px rgba(15, 42, 67, 0.04), 0 8px 24px -12px rgba(15, 42, 67, 0.12)',
        float: '0 12px 40px -16px rgba(15, 42, 67, 0.28)',
      },
      maxWidth: { container: '1280px' },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: { 'fade-up': 'fade-up 0.4s ease-out both' },
    },
  },
  plugins: [],
}
