import { expect, test } from '@playwright/test';
import { collectErrors, confirmDialog, id, openApp, tap } from './helpers';

test('aucune requête hors de l’appareil, et partie jouable une fois le réseau coupé', async ({ page, context }) => {
  const errors = collectErrors(page);
  const external: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && !['data:', 'blob:'].includes(u.protocol)) external.push(r.url());
  });
  await openApp(page);
  // Précharge les écrans (le web charge certains modules à la demande ; l'app iOS embarque tout).
  for (const tile of ['tile-roles', 'tile-stats', 'tile-help', 'tile-games']) {
    await tap(page, tile);
    await page.goBack();
  }
  await context.setOffline(true);
  await tap(page, 'new-game');
  for (const n of ['Ana', 'Ben', 'Cléo', 'Dan', 'Eva']) {
    await id(page, 'player-name-input').fill(n);
    await id(page, 'player-name-input').press('Enter');
  }
  await tap(page, 'next-step');
  await tap(page, 'auto-compose');
  for (let i = 0; i < 3; i++) await tap(page, 'next-step');
  await tap(page, 'launch-game');
  await confirmDialog(page);
  await expect(id(page, 'phase-card')).toBeVisible();
  await tap(page, 'open-night');
  await expect(id(page, 'wake-script')).toBeVisible();
  await context.setOffline(false);
  expect(external).toEqual([]);
  expect(errors.filter((e) => !e.includes('net::ERR_INTERNET_DISCONNECTED'))).toEqual([]);
});
