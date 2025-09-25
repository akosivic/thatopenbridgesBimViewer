import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/ws/node/bimviewer/',
  server: {
    proxy: {
      '/ws/node/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
    },
    fs: {
      allow: ['..']
    }
  },
  optimizeDeps: {
    exclude: ['web-ifc']
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          'web-ifc': ['web-ifc']
        }
      }
    }
  }
});