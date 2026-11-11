import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom)/,
            },
            {
              name: 'three-vendor',
              test: /node_modules[\\/]three/,
            },
            {
              name: 'flow-vendor',
              test: /node_modules[\\/](@xyflow|d3-)/,
            },
            {
              name: 'elk-vendor',
              test: /node_modules[\\/]elkjs/,
            },
            {
              name: 'icons-vendor',
              test: /node_modules[\\/]lucide-react/,
            },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
