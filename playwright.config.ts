import { defineConfig } from '@playwright/test';

/**
 * E2E_DEV=1 : mêmes tests sur le serveur de développement d'Expo (Metro,
 * React en mode développement : avertissements actifs, code non optimisé).
 * Sans cette variable : export de production (`npm run build:web`).
 */
const DEV = process.env.E2E_DEV === '1';

/**
 * Tests de bout en bout sur l'export web de l'application (Chromium).
 * Prérequis : `npm run build:web` (dossier dist/). Le serveur local ajoute
 * les en-têtes d'isolation nécessaires à SQLite (wasm + SharedArrayBuffer).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: DEV ? 240_000 : 120_000,
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
  webServer: DEV
    ? { command: 'npx expo start --web --port 8099', url: 'http://localhost:8099', reuseExistingServer: false, timeout: 240_000, env: { CI: '1', BROWSER: 'none' } }
    : {
        command: 'node scripts/serve-web.mjs 8099',
        url: 'http://localhost:8099',
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
