import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'node:path';

/**
 * The widget has two build modes:
 *  - `dev` / default build: produces an IIFE bundle at `dist/laundry-widget.js`
 *    that stores can <script src="..."> on any page.
 *  - A `demo.html` at the root is also served in dev so we can iterate locally.
 */
export default defineConfig({
  plugins: [preact()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/widget.ts'),
      name: 'LaundryWidget',
      formats: ['iife'],
      fileName: () => 'laundry-widget.js',
    },
    rollupOptions: {
      output: {
        // Inline CSS into the JS bundle so a single <script> tag works.
        inlineDynamicImports: true,
      },
    },
    cssCodeSplit: false,
  },
});
