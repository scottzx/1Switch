import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'robots.txt'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],

  base: '/app/iclaw/',

  // 防止 Vite 清除 Rust 错误信息
  clearScreen: false,

  // Tauri 期望使用固定端口，如果端口不可用则失败
  server: {
    port: 1421,
    strictPort: true,
    watch: {
      // 监听 src-tauri 目录变化
      ignored: ['**/src-tauri/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  // 生产构建配置
  build: {
    // Tauri 在 Windows 上使用 Chromium，在 macOS 和 Linux 上使用 WebKit
    target: process.env.TAURI_ENV_PLATFORM === 'windows' 
      ? 'chrome105' 
      : 'safari14',
    // 不压缩以便调试
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    // 生成 sourcemap 以便调试
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  
  // 环境变量
  envPrefix: ['VITE_', 'TAURI_ENV_'],
});
