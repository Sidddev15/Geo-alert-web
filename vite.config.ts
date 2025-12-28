import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   strategies: 'generateSW',

    //   // IMPORTANT: keep caching minimal & safe
    //   workbox: {
    //     navigateFallback: '/',
    //     runtimeCaching: [],
    //   },

    //   manifest: {
    //     name: 'Geo Alert',
    //     short_name: 'GeoAlert',
    //     description: 'One-tap location & emergency alerts',
    //     start_url: '/',
    //     display: 'standalone',
    //     background_color: '#0b0b0d',
    //     theme_color: '#0b0b0d',
    //     icons: [
    //       {
    //         src: '/icons/icon-192.png',
    //         sizes: '192x192',
    //         type: 'image/png',
    //       },
    //       {
    //         src: '/icons/icon-512.png',
    //         sizes: '512x512',
    //         type: 'image/png',
    //       },
    //     ],
    //   },
    // }),
  ],
})
