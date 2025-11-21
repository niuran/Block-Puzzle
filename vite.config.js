import { defineConfig } from 'vite';

export default defineConfig({
    base: '/Block-Puzzle/', // Use relative paths for assets
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
    }
});
