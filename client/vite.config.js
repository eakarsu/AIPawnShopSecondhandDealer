import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    strictPort: true,
    port: Number(process.env.FRONTEND_PORT || 3000),
    proxy: {
      '/api': process.env.VITE_API_URL || `http://127.0.0.1:${process.env.BACKEND_PORT || 3001}`
    }
  }
})
