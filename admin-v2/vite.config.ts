import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

export default defineConfig({
    plugins: [react(), viteSingleFile()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        target: 'esnext',
        assetsInlineLimit: 100000000, // Inline everything
        chunkSizeWarningLimit: 100000000,
        cssCodeSplit: false, // Put CSS in JS/HTML
        rollupOptions: {
            output: {
                manualChunks: undefined, // No code splitting
            },
        },
    },
});
