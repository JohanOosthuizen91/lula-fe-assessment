import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // The app calls /api/...; json-server serves the same paths without the prefix.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Strip only the leading "/api".
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
