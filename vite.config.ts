import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const enableSourcemap = env.VITE_BUILD_SOURCEMAP === 'true';

  return {
    plugins: [react()],
    base: '/ws/node/bimviewer/',
    server: {
      proxy: {
        '/ws/node/api': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', () => {
              // console.error('⚠️ Proxy error - make sure backend server is running on port 8001');
              // console.error('Run: npm run start:dev (to start both frontend and backend)');
              // console.error('Error details:', err.message);
            });
          },
        },
        // Proxy auth routes to bridges-hub gateway
        '/ws/node/auth': {
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
      sourcemap: enableSourcemap,
      rollupOptions: {
        external: [],
        output: {
          manualChunks: {
            'web-ifc': ['web-ifc']
          }
        }
      }
    }
  };
});