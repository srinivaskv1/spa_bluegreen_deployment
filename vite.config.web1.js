import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { renameSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'rename-index',
      closeBundle() {
        const oldPath = path.resolve(__dirname, 'web1/index-web1.html');
        const newPath = path.resolve(__dirname, 'web1/index.html');
        try {
          renameSync(oldPath, newPath);
          console.log('✓ Renamed index-web1.html to index.html');
        } catch (err) {
          console.error('Failed to rename:', err.message);
        }
      }
    }
  ],
  base: './',
  root: '.',
  build: {
    outDir: 'web1',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'index-web1.html')
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src-web1')
    }
  }
});
