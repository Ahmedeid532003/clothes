import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Same-origin /api → Fly (avoids CORS when using `npm run dev:online`)
      proxy: {
        '/api': {
          target: process.env.MAHALY_FLY_API || 'https://mahalyerp-api.fly.dev',
          changeOrigin: true,
          secure: true,
        },
      },
    },
    build: {
      sourcemap: false,
      reportCompressedSize: false,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          'canvas/product/index': path.resolve(__dirname, 'canvas/product/index.html'),
          'canvas/purchases/index': path.resolve(__dirname, 'canvas/purchases/index.html'),
          'canvas/employees/index': path.resolve(__dirname, 'canvas/employees/index.html'),
          'canvas/suppliers/index': path.resolve(__dirname, 'canvas/suppliers/index.html'),
        },
        maxParallelFileOps: 2,
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
            if (id.includes('lucide-react')) return 'icons';
            // Keep react + react-dom + scheduler in one chunk to avoid runtime errors.
            return 'vendor';
          },
        },
      },
    },
  };
});
