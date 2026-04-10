import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: '/app/terminal/',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      port: 1422,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_URL || 'http://10.100.71.143:8080',
          changeOrigin: true,
        },
      },
    },
    envPrefix: 'VITE_',
  };
});
