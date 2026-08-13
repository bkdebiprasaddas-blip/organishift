import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiPort = process.env.ORGANISHIFT_API_PORT || '5000';
const webPort = Number(process.env.ORGANISHIFT_WEB_PORT) || 5173;

export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    strictPort: true,
    proxy: {
      '/api': `http://localhost:${apiPort}`
    }
  }
});
