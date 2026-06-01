/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0A0A0B',
          elev: '#141416',
          card: '#1A1A1D',
          cardElev: '#222226',
        },
        fg: {
          DEFAULT: '#F5F5F7',
          dim: 'rgba(245,245,247,0.58)',
          faint: 'rgba(245,245,247,0.36)',
        },
        accent: {
          DEFAULT: '#F08A3E',
          dim: 'rgba(240,138,62,0.14)',
        },
        green: { DEFAULT: '#3FBF7F' },
        blue: { DEFAULT: '#5B8DEF' },
        purple: { DEFAULT: '#8B7BD9' },
        pink: { DEFAULT: '#E07AA8' },
        gold: { DEFAULT: '#D9B86E' },
        line: {
          DEFAULT: 'rgba(255,255,255,0.06)',
          strong: 'rgba(255,255,255,0.10)',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui'],
        rounded: ['ui-rounded', 'system-ui'],
        mono: ['ui-monospace', 'SFMono-Regular'],
      },
    },
  },
  plugins: [],
};
