// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

function packageNameFromId(id: string) {
  // Extract the package name from a node_modules path, including scoped packages.
  const match = id.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
  return match ? match[1] : null;
}

export default defineConfig({
  plugins: [react(), visualizer({ filename: 'dist/stats.html', open: true })],
  resolve: {
    alias: {
      // Force single copies of react/react-dom to avoid duplicates
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
    }
  },
  optimizeDeps: {
    // Prebundle React / MUI / Emotion so deps are stable during dev
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/system',
      '@mui/styled-engine',
      '@emotion/react',
      '@emotion/styled',
      '@emotion/cache',
      '@emotion/react/jsx-runtime'
    ]
  },
  server: {
    port: 5173,
  },
  build: {
    sourcemap: true,
    outDir: 'dist',
    // Use terser (safer wrt TDZ/minifier reordering). Use minify: false for debugging.
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id) return;
          if (id.includes('node_modules')) {
            // Put react/react-dom + emotion + styled engine in the same chunk
            // so initialization order is stable for mui/emotion runtime code.
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router-dom') ||
              id.includes('@emotion') ||
              id.includes('@mui/styled-engine')
            ) {
              return 'react-vendor';
            }

            // MUI splits: specific first, generic later
            if (id.includes('@mui/icons-material')) return 'mui-icons';
            if (id.includes('@mui/material/esm/styles') || id.includes('@mui/material/styles')) return 'mui-styles';
            // remaining @mui material code -> mui-core (covers components, utils, etc.)
            if (id.includes('@mui/material') || id.includes('@mui/base')) return 'mui-core';

            // Keep large libs in their own chunk to avoid a huge 'vendor'
            if (id.includes('jszip')) return 'jszip';
            if (id.includes('papaparse')) return 'papaparse';
            if (id.includes('dexie')) return 'dexie';
            if (id.includes('@zxing')) return 'zxing';

            // Default: create a per-package chunk name so vendor is split up.
            const pkg = packageNameFromId(id);
            if (pkg) {
              // normalize '@' from scoped packages (can't use '/' in filenames)
              return `npm.${pkg.replace('/', '__').replace('@', '')}`;
            }
            return 'vendor';
          }
        },
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**/*'],
  },
});
