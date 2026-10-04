/** @type {import('tailwindcss').Config} */

// Greenhouse palette: chlorophyll greens, a green-tinted neutral, irrigation blue.
// Amber (warning) and red (critical) keep Tailwind's defaults as semantic colours.
const leaf = {
  50: '#eff6ec', 100: '#dcebd5', 200: '#bbd8ae', 300: '#92bf80', 400: '#6aa457',
  500: '#4c8a3b', 600: '#3b712e', 700: '#2f5b26', 800: '#264a20', 900: '#1e3b1a', 950: '#10220e',
};
const neutral = {
  50: '#f5f7f3', 100: '#ecf0e9', 200: '#dce3d8', 300: '#c3cdbf', 400: '#97a393',
  500: '#6e7b6b', 600: '#535f51', 700: '#3f493e', 800: '#2a3229', 900: '#1a201a', 950: '#0f130f',
};
const water = {
  50: '#eef5f8', 100: '#d7e8ef', 200: '#b0d1df', 300: '#80b3ca', 400: '#5293b0',
  500: '#387894', 600: '#2c6079', 700: '#254e62', 800: '#1f3f4f', 900: '#1a3341', 950: '#0f202a',
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: { green: leaf, gray: neutral, blue: water },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
