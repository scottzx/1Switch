import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const apiTarget = process.env.VITE_API_BASE_URL || 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  base: '/app/frp/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 1422,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
