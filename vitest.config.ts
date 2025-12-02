import { mergeConfig, defineConfig } from 'vitest/config'
import viteConfig from './vite.config' 

export default mergeConfig (
    viteConfig,
    defineConfig({
        test: {
            environment: 'jsdom', // or 'jsdom' if you use DOM env
            coverage: {
            provider: 'v8',           // or 'c8' — these support lcov & html
            reporter: [
                'text',
                ['lcov', { projectRoot: './' }], // emit SF relative to repo root
                'html'
            ],
            reportsDirectory: 'coverage-reports/unit', // ← your new unit folder
            // optional:
            // all: true,
            // include: ['src/**/*.ts'],
            // exclude: ['test/**']
            },
        },
    }),
)
