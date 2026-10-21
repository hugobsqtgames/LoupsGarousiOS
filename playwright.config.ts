import { defineConfig } from '@playwright/test';

/**
 * Tests de bout en bout sur l'export web de l'application (Chromium).
 * Prérequis : `npm run build:web` (dossier dist/). Le serveur local ajoute
 * les en-têtes d'isolation nécessaires à SQLite (wasm + SharedArrayBuffer).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e-results.json' }]],
  use: {
    baseURL: 'http://localhost:8099',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-web.mjs 8099',
    url: 'http://localhost:8099',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
