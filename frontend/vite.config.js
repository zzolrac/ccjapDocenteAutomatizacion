import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://backend:3001', // Usar el nombre del servicio Docker
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, '') // Opcional: si necesitas reescribir la ruta
      }
    }
  }
})
