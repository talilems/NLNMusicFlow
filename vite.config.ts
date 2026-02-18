import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'ChordFlow Setlist Manager',
          short_name: 'ChordFlow',
          description: 'Manage lyrics, chords, and setlists offline.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          icons: [
            {
              src: 'https://cdn.lucide.dev/music.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'https://cdn.lucide.dev/music.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        }
      })
    ],
    define: {
      // Polyfill process.env.API_KEY so the existing service code works
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});