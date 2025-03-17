import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'CeA App',
        short_name: 'CeA App',
        description: 'Employee Management App',
        theme_color: '#5ABB37',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Force update on each build
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        // Don't cache anything during development
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      }
    })
  ],
  build: {
    sourcemap: true,
    // Reduce chunk size for better performance
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    strictPort: true,
  }
}); 