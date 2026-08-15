import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
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
