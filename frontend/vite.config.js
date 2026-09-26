import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// L'interface est compilée dans ../public/spa et servie par le back-end Laravel (voir scripts/post-build.mjs).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: '../public/spa', emptyOutDir: true, chunkSizeWarningLimit: 900 },
  server: { proxy: { '/api': 'http://127.0.0.1:8000' } },
})
