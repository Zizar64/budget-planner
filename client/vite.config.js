import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all addresses (0.0.0.0)
    watch: {
      usePolling: true, // Needed for Windows Docker file events
    },
    proxy: {
      '/api': process.env.VITE_API_URL || 'http://localhost:3000'
    }
  }
})
