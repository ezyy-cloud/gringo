import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3001,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    // Make sure .env.production takes precedence in production mode
    envPrefix: 'VITE_',
    // During build, define explicit environment variables
    define: {
      'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
      'process.env.VITE_BOT_SERVICE_URL': JSON.stringify(env.VITE_BOT_SERVICE_URL),
      'process.env.VITE_BOT_API_KEY': JSON.stringify(env.VITE_BOT_API_KEY),
      'process.env.VITE_ENABLE_ANALYTICS': JSON.stringify(env.VITE_ENABLE_ANALYTICS),
      'process.env.VITE_ENABLE_NOTIFICATIONS': JSON.stringify(env.VITE_ENABLE_NOTIFICATIONS),
      'process.env.VITE_MAPBOX_ACCESS_TOKEN': JSON.stringify(env.VITE_MAPBOX_ACCESS_TOKEN),
    },
  };
}); 