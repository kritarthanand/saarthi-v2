/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#000000',
          elevated: '#0f1011',
          surface: '#16181a',
          selected: '#1f2226',
        },
        fg: {
          DEFAULT: '#ffffff',
          muted: '#b0b4ba',
          subtle: '#60646c',
        },
        accent: {
          DEFAULT: '#7c8cf8',
          muted: '#3a4470',
        },
        border: {
          DEFAULT: '#22252a',
          muted: '#16181a',
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
