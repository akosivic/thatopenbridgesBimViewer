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
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('⚠️ Proxy error - make sure backend server is running on port 8001');
            console.error('Run: npm run start:dev (to start both frontend and backend)');
            console.error('Error details:', err.message);
          });
        },
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