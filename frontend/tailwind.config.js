/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1A73E8', // Google Blue
          hover: '#1557B0',
        },
        secondary: {
          DEFAULT: '#34A853', // Google Green
        },
        warning: {
          DEFAULT: '#FBBC04',
          light: '#FEF7E0',
        },
        danger: {
          DEFAULT: '#EA4335',
          light: '#FCE8E6',
        },
        orange: {
          DEFAULT: '#FA7B17',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F1F3F4',
        },
        background: '#F8F9FA',
        on: {
          surface: '#202124',
          surfaceSec: '#5F6368',
          surfaceTer: '#80868B',
        },
        divider: '#E8EAED',
        success: {
          light: '#E6F4EA',
        },
        blue: {
          light: '#E8F0FE',
        },
        purple: {
          DEFAULT: '#6200EE',
          light: '#F3E5FE',
        }
      },
      fontFamily: {
        sans: ['Google Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
        hover: '0 4px 12px rgba(0,0,0,0.15)',
      }
    },
  },
  plugins: [],
}
