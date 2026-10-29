import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  base: '/molodaya-nauka-2026/',
  build: { rollupOptions: { input: {
    main: fileURLToPath(new URL('./index.html',import.meta.url)),
    manage: fileURLToPath(new URL('./manage.html',import.meta.url)),
  } } },
});
