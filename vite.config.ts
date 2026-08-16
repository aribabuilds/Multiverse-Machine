import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves a project page from /<repo>/, not /, so asset URLs
  // need that prefix baked in — but only there. Vercel/Netlify/local dev all
  // serve from the root and would break if this were hardcoded.
  base: process.env.GITHUB_PAGES === 'true' ? '/Multiverse-Machine/' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        // Unstyled harness for sanity-checking the generation engine directly (M2).
        testHarness: resolve(import.meta.dirname, 'test-harness.html'),
      },
    },
  },
})
