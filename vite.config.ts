import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // The artifact build is inlined into a single HTML file, so it can't load lazy chunks.
  build: mode === 'artifact' ? { rollupOptions: { output: { inlineDynamicImports: true } } } : {},
}))
