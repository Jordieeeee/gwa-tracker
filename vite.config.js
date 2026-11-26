import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'client',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // In development, the React app calls /api and Vite forwards it to Express.
    proxy: { '/api': 'http://localhost:3000' },
    fs: { allow: ['..'] }, // allow importing ../shared
  },
});
