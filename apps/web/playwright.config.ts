import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: './tests', testMatch: '**/*.spec.ts', fullyParallel: false, workers: 1,
    use: { baseURL: 'http://127.0.0.1:4321', channel: 'msedge', headless: true, viewport: { width: 1440, height: 1000 } },
    webServer: [
        { command: 'node tests/nest-fixture.mjs', url: 'http://127.0.0.1:4310/health', reuseExistingServer: false, timeout: 60000 },
        { command: 'npm run dev', url: 'http://127.0.0.1:4321/login', reuseExistingServer: false, timeout: 60000, env: { ASTRO_TELEMETRY_DISABLED: '1', PUBLIC_API_URL: 'http://127.0.0.1:4310' } },
    ],
});
