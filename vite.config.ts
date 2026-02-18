import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // 1. Load env file based on `mode` in the current working directory.
  // We use (process as any).cwd() to satisfy TypeScript in some environments.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // 2. Aggressively find the API Key. 
  // Vercel System variables are in process.env, .env files are in env object.
  const apiKey = env.VITE_API_KEY || env.API_KEY || process.env.VITE_API_KEY || process.env.API_KEY || '';

  if (mode === 'production' && !apiKey) {
    console.warn("⚠️ WARNING: API_KEY is missing in the build environment!");
  }

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
      // 3. Inject the key globaly so it's available in the browser
      '__GENAI_API_KEY__': JSON.stringify(apiKey),
      // Fallback for code using process.env
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  };
});