// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';
import istanbul from 'vite-plugin-istanbul';

const isE2E = Boolean(process.env.E2E_COVERAGE)

export default defineConfig({
  plugins: [
    react(),
    visualizer({ filename: 'dist/stats.html', open: false }),
    isE2E &&
      istanbul({
        include: 'src/**/*',
        extension: ['.js', '.ts', '.jsx', '.tsx'],
        requireEnv: false,     // allow instrumenting unconditionally for CI e2e builds
        cypress: true,         // enables window.__coverage__ instrumentation style
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      // force single copies of react/react-dom
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
    }
  },
  optimizeDeps: {
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
      '@emotion/react/jsx-runtime',
      'hoist-non-react-statics' // ensure it is pre-bundled with others
    ]
  },
  server: {
    port: 5173
  },
  build: {
    sourcemap: true,
    outDir: 'dist',
    // esbuild is lighter. If you want terser for final prod, run it on a beefy CI runner.
    minify: 'esbuild',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id) return;
          if (id.includes('node_modules')) {
            // Put everything from node_modules into the same vendor chunk,
            // except a few very large libs we keep separate for load reasons.
            if (
              id.includes('jszip') ||
              id.includes('papaparse') ||
              id.includes('dexie') ||
              id.includes('@zxing')
            ) {
              // keep these large libraries separate
              if (id.includes('jszip')) return 'jszip';
              if (id.includes('papaparse')) return 'papaparse';
              if (id.includes('dexie')) return 'dexie';
              if (id.includes('@zxing')) return 'zxing';
            }
            // Everything else -> single vendor chunk
            return 'vendor';
          }
        }
      }
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    }
  }
});
