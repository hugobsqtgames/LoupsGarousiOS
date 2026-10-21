import { chromium } from '@playwright/test';
const OUT = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
const t = (id) => page.getByTestId(id);
let n = 0;
const shot = async (name) => { await page.waitForTimeout(350); await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${name}.png` }); };
const confirm = async () => { await t('dialog-confirm').click(); await page.waitForTimeout(200); };
try {
  await page.goto('http://localhost:8099/');
  await t('new-game').waitFor();
  await t('new-game').click();
  const names = ['Alice', 'Bruno', 'Chloé', 'David', 'Emma', 'Farid', 'Gaëlle', 'Hugo'];
  for (const nm of names) { await t('player-name-input').fill(nm); await t('player-name-input').press('Enter'); }
  await shot('players');
  await t('next-step').click();
  await t('auto-compose').click();
  await shot('roles');
  await t('next-step').click();
  await t('toggle-reveal-assign').click();
  await shot('assign');
  await t('next-step').click();
  await shot('variants');
  await t('next-step').click();
  await shot('review');
  await t('launch-game').click();
  await confirm();
  await page.waitForTimeout(800);
  await shot('dashboard-night');
  await t('open-night').click();
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250);
    if (await t('resolve-night').count()) break;
    await shot(`night-step-${i}`);
    // choisir la première cible disponible si une grille existe
    const grid = page.locator('[data-testid^="target-grid-"]:not([aria-disabled="true"])');
    const multi = page.locator('[data-testid^="multi-grid-"]:not([aria-disabled="true"])');
    if (await multi.count()) { await multi.nth(0).click(); await multi.nth(1).click(); }
    else if (await grid.count()) await grid.nth(i % Math.max(1, await grid.count())).click();
    if (await t('wolfhound-village').count()) await t('wolfhound-village').click();
    await t('submit-step').click();
  }
  await shot('night-summary');
  await t('resolve-night').click();
  await confirm();
  await page.waitForTimeout(500);
  await shot('dawn');
  if (await t('decision-panel').count()) { const g = page.locator('[data-testid^="decision-grid-"]'); await g.first().click(); await t('decision-confirm').click(); await confirm(); }
  await t('start-day').click();
  await confirm();
  await page.waitForTimeout(500);
  await shot('dashboard-day');
  await t('open-mayor').click();
  await shot('mayor-open');
  await t('open-ballot').click();
  await page.waitForTimeout(300);
  const rows = page.locator('[data-testid^="vote-plus-"]');
  await rows.nth(0).click(); await rows.nth(0).click(); await rows.nth(1).click();
  await shot('mayor-votes');
  await t('close-ballot').click(); await confirm();
  await shot('mayor-closed');
  await t('confirm-ballot').click(); await confirm();
  await shot('mayor-done');
  await t('goto-elimination').click();
  await t('open-ballot').click();
  await page.waitForTimeout(300);
  const p2 = page.locator('[data-testid^="vote-plus-"]');
  await p2.nth(2).click(); await p2.nth(2).click(); await p2.nth(3).click();
  await shot('vote-tally');
  await page.locator('[data-testid^="vote-minus-"]').nth(3).click();
  await t('undo-vote-op').click();
  await shot('vote-corrected');
  await t('close-ballot').click(); await confirm();
  await shot('vote-closed');
  await t('confirm-ballot').click(); await confirm();
  await page.waitForTimeout(400);
  await shot('vote-done');
  if (await t('decision-panel').count()) { await shot('vote-decision'); }
  await t('back-dashboard').click();
  await page.waitForTimeout(400);
  await shot('dashboard-after-vote');
  await t('open-history').click();
  await shot('history');
  await t('history-view-actions').click();
  await shot('history-actions');
} catch (e) {
  logs.push('SCRIPT ERROR: ' + e.message.split('\n')[0]);
  await shot('error');
}
console.log(logs.join('\n'));
await browser.close();
