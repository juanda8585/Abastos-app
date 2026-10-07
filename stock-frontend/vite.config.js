import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development the SPA runs on :5173 while the API runs on :3000;
    // proxy /api so the frontend can keep using relative URLs.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
