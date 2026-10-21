import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { confirmDialog, id, openApp, tap } from './helpers';

/**
 * Mesures de performance sur l'export web (Chromium, machine de CI Linux).
 * Ce ne sont PAS des mesures iPhone. Fixture : PERF_FIXTURE=… npx jest perf-fixture
 */
const FIXTURE = 'e2e/.artifacts/big-export.json';
test.skip(!existsSync(FIXTURE), 'Fixture absente');

test('mesures : démarrage, import et ouverture d’une partie de 2 024 actions, annulation', async ({ page }) => {
  const results: Record<string, number> = {};
  const t0 = Date.now();
  await openApp(page);
  results.demarrageMs = Date.now() - t0;
  const nav = await page.evaluate(() => {
    const e = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return { domContentLoaded: Math.round(e.domContentLoadedEventEnd), load: Math.round(e.loadEventEnd) };
  });
  results.domContentLoadedMs = nav.domContentLoaded;

  await page.goto('/settings/data');
  const chooser = page.waitForEvent('filechooser');
  await id(page, 'import-data').click();
  const t1 = Date.now();
  await (await chooser).setFiles(FIXTURE);
  await expect(page.getByText('Import réussi')).toBeVisible({ timeout: 60_000 });
  results.importMs = Date.now() - t1;
  await confirmDialog(page);

  await page.goto('/');
  const t2 = Date.now();
  await tap(page, 'resume-game');
  await expect(id(page, 'phase-card')).toBeVisible({ timeout: 60_000 });
  results.ouverturePartieMs = Date.now() - t2 - 480;

  const t3 = Date.now();
  await id(page, 'undo').click();
  await confirmDialog(page);
  await expect(page.getByText('Dernière action annulée')).toBeVisible();
  results.annulationMs = Date.now() - t3 - 480;

  const mem = await page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0);
  results.tasJsMo = Math.round(mem / 1024 / 1024);
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/perf.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
  expect(results.ouverturePartieMs).toBeLessThan(15_000);
});
