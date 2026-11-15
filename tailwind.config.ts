import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Theme: "Twilight Violet" - accent family (formerly cyan) + indigo-tinted neutrals
        cyan: colors.violet,
        slate: {
          50: '#f8f7fc',
          100: '#efedf7',
          200: '#dcd9eb',
          300: '#bdb9d6',
          400: '#9a95b8',
          500: '#716c92',
          600: '#524e72',
          700: '#3a3756',
          800: '#262440',
          900: '#171629',
          950: '#0d0c1a',
        },
        background: '#0b0a16',
        surface: '#13112a',
        'surface-elevated': '#1c1a38',
        'cyber-cyan': '#a78bfa',
        'cyber-green': '#00ff88',
        'cyber-amber': '#f59e0b',
        'cyber-red': '#ff0055',
        'cyber-purple': '#a855f7',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'monospace'],
        pencil: ['var(--font-pencil)', '"Love Ya Like A Sister"', 'cursive', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
