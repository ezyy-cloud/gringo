/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BOT_SERVICE_URL: string;
  readonly VITE_BOT_API_KEY: string;
  readonly VITE_API_URL: string;
  readonly DEV: boolean;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 