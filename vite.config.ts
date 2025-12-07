import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 5000,
    host: '0.0.0.0',
    hmr: {
      clientPort: 443,
    },
    allowedHosts: true
  },
  plugins: [react()],
});
