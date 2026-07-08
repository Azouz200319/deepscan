/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: '16px',
        md: '12px',
        sm: '8px',
        full: '9999px'
      },
      colors: {
        brand: {
          50: '#fef7ee',
          100: '#fdebd0',
          200: '#fbd5a6',
          300: '#f8b876',
          400: '#f4944d',
          500: '#D97706', // primary brown/amber
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#451a03',
          950: '#1c0a00',
        },
        surface: {
          50: '#F8F9FA',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
        },
        glow: {
          DEFAULT: '#c49a6c',
          strong: '#9a6237'
        }
      }
    }
  },
  plugins: [import("tailwindcss-animate")],
}
