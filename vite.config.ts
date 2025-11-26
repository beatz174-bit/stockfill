// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

function packageNameFromId(id: string) {
  const match = id.match(/node_modules[/\\]((?:@[^/\\]+[/\\])?[^/\\]+)/);
  return match ? match[1] : null;
}

export default defineConfig({
  plugins: [
    react(),
    // keep open: false so it doesn't try to open a browser in Docker/CI
    visualizer({ filename: 'dist/stats.html', open: false })
  ],
  resolve: {
    alias: {
      // ensure only one copy of react/react-dom is used
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    }
  },
  optimizeDeps: {
    // prebundle to make dev stable
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
    // keep false in container to reduce memory pressure; set true for debugging
    sourcemap: false,
    outDir: 'dist',
    // esbuild is much lighter than terser: choose esbuild for local/CI builds.
    // If you want terser for production, switch to 'terser' on a beefy CI runner.
    minify: 'esbuild',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id) return;
          if (id.includes('node_modules')) {
            // Put React + MUI + Emotion + styled engine + router into a single vendor chunk
            if (/node_modules[/\\](react|react-dom|react-router-dom|@mui|@emotion|@mui[/\\]styled-engine)/.test(id)) {
              return 'react-vendor';
            }

            // Keep very large libraries in their own chunk to avoid one giant file
            if (id.includes('jszip')) return 'jszip';
            if (id.includes('papaparse')) return 'papaparse';
            if (id.includes('dexie')) return 'dexie';
            if (id.includes('@zxing')) return 'zxing';

            // Default: small per-package chunk
            const pkg = packageNameFromId(id);
            if (pkg) {
              return `npm.${pkg.replace('/', '__').replace('@', '')}`;
            }
            return 'vendor';
          }
        },
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    }
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**/*'],
  },
});
