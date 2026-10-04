import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Large libraries get their own cached chunks in the normal build.
const vendorGroups = [
  { name: 'firestore', test: /node_modules[\\/]@firebase[\\/](firestore|webchannel-wrapper)[\\/]/ },
  { name: 'firebase', test: /node_modules[\\/](@firebase|firebase)[\\/]/ },
  { name: 'charts', test: /node_modules[\\/](chart\.js|react-chartjs-2|@kurkle)[\\/]/ },
  { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
  { name: 'motion', test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/ },
  { name: 'validation', test: /node_modules[\\/]zod[\\/]/ },
]

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Public path; the GitHub Pages workflow sets BASE_PATH=/AgroClimatic-App/
  base: process.env.BASE_PATH || '/',
  build:
    mode === 'artifact'
      ? {
          // The artifact build is inlined into one HTML file by design, so it can't load
          // lazy chunks and its single bundle is expected to be large.
          chunkSizeWarningLimit: 4096,
          rolldownOptions: { output: { codeSplitting: false } },
        }
      : {
          // The Firestore SDK is one ~540 KB module that can't be split further. It is loaded
          // on demand (real accounts only), so allow that single chunk without a warning.
          chunkSizeWarningLimit: 600,
          rolldownOptions: { output: { codeSplitting: { groups: vendorGroups } } },
        },
}))
