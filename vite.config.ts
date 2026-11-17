import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// La app se publica en GitHub Pages bajo /va360-clonello/.
export default defineConfig({
  base: '/va360-clonello/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
});
