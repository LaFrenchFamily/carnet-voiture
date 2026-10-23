/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // The OCR engine (~5 MB) is cached on first use, not downloaded at install.
        globIgnores: ['ocr/**'],
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith('/ocr/'), handler: 'CacheFirst', options: { cacheName: 'ocr' } },
        ],
      },
      manifest: {
        name: 'Carnet de Voiture',
        short_name: 'Carnet',
        lang: 'fr',
        display: 'standalone',
        start_url: '/',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
