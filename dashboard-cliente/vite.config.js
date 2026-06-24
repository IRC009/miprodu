import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import webfontDl from 'vite-plugin-webfont-dl'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    webfontDl(),
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      svg: {
        multipass: true,
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Carta y Mesa - POS y Dashboard',
        short_name: 'Carta y Mesa',
        description: 'Punto de Venta y Panel de Administración de Restaurantes',
        theme_color: '#8b1a2e',
        background_color: '#1a0a10',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'favicon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'favicon.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Pre-cache all static assets on first load
        globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2,ico,txt}'],
        globIgnores: ['**/favicon.png'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,

        // ── CRITICAL for SPA offline support ──────────────────────────────────
        // When the user navigates to any route (/caja, /pedidos, etc.) without
        // internet, the service worker intercepts the navigation request and
        // serves the cached index.html instead of hitting the network (which
        // causes the Chrome dinosaur screen).
        navigateFallback: '/index.html',
        // Do NOT intercept API calls or Firebase endpoints with the SPA fallback
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/__.+__\//,             // Firebase emulator routes
          /firestore\.googleapis\.com/,
          /identitytoolkit\.googleapis\.com/,
          /securetoken\.googleapis\.com/,
        ],

        // ── Runtime caching strategies ─────────────────────────────────────────
        runtimeCaching: [
          {
            // Firebase Firestore — network first with 3s timeout, fall back to
            // Firestore's own IndexedDB persistence (handled by the Firebase SDK)
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-api',
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts — cache first (fonts never change once loaded)
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // App static assets (JS/CSS chunks) — stale-while-revalidate so the
            // user always gets a fast response from cache and updates in background
            urlPattern: /\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Images — cache first, long TTL
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      }
    })
  ],
  build: {
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Firebase core — needed on startup
          if (id.includes('firebase/app') || id.includes('firebase/auth') || id.includes('firebase/firestore') || id.includes('firebase/functions') || id.includes('firebase/storage')) {
            return 'firebase-core';
          }
          // Firebase analytics + AI — lazy loaded, never in main bundle
          if (id.includes('firebase/analytics') || id.includes('firebase/ai') || id.includes('firebase/app-check')) {
            return 'firebase-optional';
          }
          // Chart / Analytics heavy libraries
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) {
            return 'charts';
          }
          // React core
          if (id.includes('react-dom') || id.includes('react-router')) {
            return 'react-vendor';
          }
          // Lucide icons
          if (id.includes('lucide-react')) {
            return 'icons';
          }
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    testTimeout: 10000,
  },
})

