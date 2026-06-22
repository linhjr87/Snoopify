import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)', surface: 'var(--surface)', ink: 'var(--ink)',
        muted: 'var(--muted)', line: 'var(--line)', track: 'var(--track)',
        accent: 'var(--accent)', 'accent-soft': 'var(--accent-soft)', rust: 'var(--rust)',
      },
      fontFamily: {
        sans: ["'Hanken Grotesk'", 'sans-serif'],
        serif: ["'Newsreader'", 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
