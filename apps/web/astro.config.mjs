import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import { loadEnv } from 'vite';
const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), 'PUBLIC_');
export default defineConfig({
    output: 'server',
    adapter: node({ mode: 'standalone' }),
    devToolbar: { enabled: false },
    server: { host: '127.0.0.1', port: 4321 },
    vite: { server: { proxy: { '/api': { target: env.PUBLIC_API_URL || 'http://localhost:3000', changeOrigin: true } } } },
});
