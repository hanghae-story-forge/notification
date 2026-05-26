import type { Config } from 'tailwindcss';

const config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(215 28% 17%)',
        input: 'hsl(215 28% 17%)',
        ring: 'hsl(188 95% 43%)',
        background: 'hsl(222 47% 6%)',
        foreground: 'hsl(210 40% 98%)',
        primary: {
          DEFAULT: 'hsl(262 83% 58%)',
          foreground: 'hsl(210 40% 98%)',
        },
        secondary: {
          DEFAULT: 'hsl(217 33% 17%)',
          foreground: 'hsl(210 40% 98%)',
        },
        muted: {
          DEFAULT: 'hsl(217 33% 14%)',
          foreground: 'hsl(215 20% 65%)',
        },
        destructive: {
          DEFAULT: 'hsl(346 84% 61%)',
          foreground: 'hsl(210 40% 98%)',
        },
        card: {
          DEFAULT: 'hsl(222 47% 8%)',
          foreground: 'hsl(210 40% 98%)',
        },
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
