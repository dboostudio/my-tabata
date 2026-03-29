import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'MyTabata — 타바타 타이머',
                short_name: 'MyTabata',
                description: 'Free Tabata interval timer PWA with 8 presets, voice guidance, and offline support',
                theme_color: '#FF4D4D',
                background_color: '#1a1a2e',
                display: 'standalone',
                start_url: '/',
                scope: '/',
                orientation: 'portrait',
                categories: ['fitness', 'health', 'sports'],
                icons: [
                    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
                    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
                    { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }
                ],
                shortcuts: [
                    {
                        name: 'Start Tabata Classic',
                        short_name: 'Classic',
                        url: '/?preset=tabata-classic',
                        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }]
                    },
                    {
                        name: 'Workout Log',
                        short_name: 'Log',
                        url: '/?panel=history',
                        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }]
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg}']
            }
        })
    ]
});
