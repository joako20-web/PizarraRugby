import { defineConfig } from 'vite';

export default defineConfig({
    root: '.', // root is the project root (where index.html is)
    base: './', // Use relative paths for deployment
    // publicDir: 'public', // default
    build: {
        outDir: 'dist',
        emptyOutDir: true
    },
    server: {
        port: 3000,
        open: true
    }
});
