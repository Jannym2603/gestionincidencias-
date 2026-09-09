const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({

    testDir: './e2e',

    testMatch: '**/*.spec.js',

    timeout: 30000,

    use: {
        baseURL: 'http://localhost:8081',
        headless: false
    }

});