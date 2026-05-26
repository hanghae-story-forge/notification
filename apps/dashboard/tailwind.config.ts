import type { Config } from 'tailwindcss';

const config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(24 10% 88%)',
        input: 'hsl(24 10% 88%)',
        ring: 'hsl(349 89% 60%)',
        background: '#ffffff',
        foreground: 'hsl(222 47% 11%)',
        primary: {
          DEFAULT: 'hsl(349 89% 60%)',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: 'hsl(20 14% 96%)',
          foreground: 'hsl(222 47% 11%)',
        },
        muted: {
          DEFAULT: 'hsl(20 14% 96%)',
          foreground: 'hsl(215 16% 47%)',
        },
        destructive: {
          DEFAULT: 'hsl(0 84% 60%)',
          foreground: '#ffffff',
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: 'hsl(222 47% 11%)',
        },
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        airbnb: '0 6px 24px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
