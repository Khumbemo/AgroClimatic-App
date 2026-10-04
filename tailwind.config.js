/** @type {import('tailwindcss').Config} */

// Greenhouse palette: chlorophyll greens, a green-tinted neutral, irrigation blue, with
// amber (warning) and red (critical) as semantic colours. Values live as R G B channels in
// src/index.css so the `.dark` class can swap the whole palette at once.
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const scale = (name) =>
  Object.fromEntries(STEPS.map((s) => [s, `rgb(var(--${name}-${s}) / <alpha-value>)`]));

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        white: 'rgb(var(--white) / <alpha-value>)',
        gray: scale('gray'),
        green: scale('green'),
        blue: scale('blue'),
        amber: scale('amber'),
        red: scale('red'),
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
