import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Using './' so the app works both at root and at /repo-name/ on GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: './',
});
