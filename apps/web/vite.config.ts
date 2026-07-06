import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export default defineConfig(({ mode }) => {
  // Load all vars from monorepo root .env (VITE_* exposed to client only)
  const env = loadEnv(mode, rootDir, '')

  return {
    envDir: rootDir,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'favicon.svg', 'favicon-*.png', 'icons/*.png'],
        manifest: {
          name: env.VITE_APP_NAME || '杭蓉机票',
          short_name: env.VITE_APP_NAME || '杭蓉机票',
          description: '杭州成都报销导向机票查询',
          theme_color: '#F2F2F7',
          background_color: '#F2F2F7',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/unpkg\.com\/holiday-calendar/,
              handler: 'CacheFirst',
              options: { cacheName: 'holidays', expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 } },
            },
          ],
        },
      }),
    ],
    server: {
      host: true,
      port: Number(env.VITE_DEV_PORT || 5173),
      proxy: {
        '/api': {
          target: `http://localhost:${env.BFF_PORT || 3001}`,
          changeOrigin: true,
        },
      },
    },
  }
})
