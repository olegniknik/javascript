// @ts-check
const { defineConfig } = require('@playwright/test');

/**
 * Playwright configuration.
 * Предполагается, что сайт запущен через `node server.js` на http://localhost:5000
 */
module.exports = defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:5000',
    headless: true,
  },
});

