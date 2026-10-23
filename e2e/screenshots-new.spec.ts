import { expect, test, type Page } from '@playwright/test';
import { confirmDialog, createManualGame, id, nightStep, openApp, tap, visible } from './helpers';

/**
 * Captures RÉELLES des nouveautés (export web dans Chromium, iPhone 390 × 844
 * puis iPad 1180 × 820). Lancement : SCREENSHOTS=1 npx playwright test e2e/screenshots-new.spec.ts
 */
test.skip(!process.env.SCREENSHOTS, 'Captures uniquement sur demande (SCREENSHOTS=1)');

const DIR = 'docs/screenshots/web';
let n = 39;
async function shot(page: Page, name: string, fullPage = false) {
  await page.waitForTimeout(500);
  n += 1;
  await page.screenshot({ path: `${DIR}/${String(n).padStart(2, '0')}-${name}.png`, fullPage });
}

const PLAYERS: [string, string][] = [
  ['Alice', 'loup-garou'],
  ['Bruno', 'voyante'],
  ['Chloé', 'gitane'],
  ['David', 'villageois'],
  ['Emma', 'villageois'],
  ['Fanny', 'villageois'],
  ['Gaspard', 'villageois'],
];

test('captures des nouveautés (téléphone)', async ({ page }) => {
  test.setTimeout(240_000);
  await openApp(page);

  // Plan de table dans l'assistant.
  await tap(page, 'new-game');
  for (const name of ['Alice', 'Bruno', 'Chloé', 'David', 'Emma', 'Fanny']) {
    await id(page, 'player-name-input').fill(name);
    await id(page, 'player-name-input').press('Enter');
  }
  await id(page, 'players-view-table').click();
  await shot(page, 'creation-plan-de-table');
  await page.goto('/');

  await createManualGame(page, PLAYERS, { toggles: ['newMoonEvents', 'mayorEnabled'] });
  await tap(page, 'open-night');
  await nightStep(page, null); // Voyante
  await nightStep(page, 'Gaspard'); // Loups
  await shot(page, 'nuit-gitane');
  await id(page, 'gypsy-card-2').click();
  await id(page, 'gypsy-question-3').click();
  await visible(page, '[data-testid^="target-grid-"]', 'Emma').first().click();
  await tap(page, 'submit-step');
  await tap(page, 'resolve-night');
  await confirmDialog(page);
  await shot(page, 'aube-annonce-a-lire', true);
  await tap(page, 'start-day');
  await confirmDialog(page);
  await tap(page, 'timer-start');
  await shot(page, 'jour-minuteur-rappels', true);
  await tap(page, 'open-vote');
  await tap(page, 'open-ballot');
  await id(page, 'tally-input-mode-hands').click();
  await visible(page, '[data-testid^="vote-row-"]', 'Alice').locator('[data-testid^="vote-tap-"]').click();
  await tap(page, 'key-3');
  await shot(page, 'vote-mains-levees');
  await tap(page, 'hands-submit');
  await tap(page, 'close-ballot');
  await confirmDialog(page);
  await tap(page, 'confirm-ballot');
  await confirmDialog(page);
  await tap(page, 'back-dashboard');
  if (await id(page, 'finish-game').count()) {
    // Le village a gagné : on garde la partie pour les captures suivantes.
  }
  await tap(page, 'open-timeline');
  await shot(page, 'chronologie', true);
  await tap(page, 'back-button');
  await tap(page, 'open-table');
  await visible(page, '[data-testid^="seat-"]', 'Chloé').first().click();
  await shot(page, 'plan-de-table', true);
  await tap(page, 'back-button');
  await tap(page, 'open-history');
  await tap(page, 'history-replay');
  await tap(page, 'replay-next-phase');
  await shot(page, 'rejeu-pas-a-pas');
  await expect(page.locator('body')).not.toBeEmpty();
});

test('captures des nouveautés (événements, téléphone, outils)', async ({ page }) => {
  test.setTimeout(240_000);
  await openApp(page);
  await createManualGame(page, PLAYERS.map(([p, r]) => [p, r === 'gitane' ? 'villageois' : r]), { toggles: ['newMoonEvents', 'mayorEnabled'] });
  await tap(page, 'open-night');
  await nightStep(page, null);
  await nightStep(page, 'Gaspard');
  await tap(page, 'resolve-night');
  await confirmDialog(page);
  await tap(page, 'start-day');
  await confirmDialog(page);
  await tap(page, 'end-day');
  await confirmDialog(page);
  await nightStep(page, null);
  await nightStep(page, 'Fanny');
  await tap(page, 'resolve-night');
  await confirmDialog(page);
  await tap(page, 'start-day');
  await confirmDialog(page);
  await tap(page, 'event-pick');
  await shot(page, 'evenements-pioche');
  await visible(page, '[data-testid^="event-deck-"]', 'Miracle').click();
  await shot(page, 'evenement-actif', true);
  await tap(page, 'event-tool-revive');
  await shot(page, 'outils-mj-retour-en-jeu');
  await page.keyboard.press('Escape');
  await page.goto('/roles/gitane');
  await shot(page, 'fiche-role-illustration');
  await page.goto('/settings');
  await id(page, 'contrast-toggle').click();
  await page.waitForTimeout(400);
  await page.goto('/');
  await shot(page, 'accueil-contraste-eleve');
  await page.goto('/settings');
  await id(page, 'contrast-toggle').click();
  await page.goto('/stats');
  await shot(page, 'statistiques-par-joueur', true);
});

test('captures du mode téléphone', async ({ page }) => {
  await openApp(page);
  await tap(page, 'new-game');
  for (const name of ['Ana', 'Ben', 'Cléa', 'Dan', 'Eli']) {
    await id(page, 'player-name-input').fill(name);
    await id(page, 'player-name-input').press('Enter');
  }
  await tap(page, 'next-step');
  for (const [role, c] of [['loup-garou', 1], ['voleur', 1], ['voyante', 1], ['villageois', 2]] as const) for (let i = 0; i < c; i++) await id(page, `role-count-${role}-plus`).click();
  await tap(page, 'next-step');
  await id(page, 'assign-mode-phone').click();
  await shot(page, 'attribution-telephone');
  await tap(page, 'next-step');
  await tap(page, 'next-step');
  await tap(page, 'launch-game');
  await confirmDialog(page);
  await tap(page, 'open-deal');
  await tap(page, 'deal-open');
  await shot(page, 'telephone-passer');
  await id(page, 'reveal-hold').click({ delay: 900 });
  await shot(page, 'telephone-role-revele');
});

test('captures iPad en paysage', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await openApp(page);
  await createManualGame(page, PLAYERS);
  await shot(page, 'ipad-tableau-de-bord');
  await tap(page, 'open-night');
  await visible(page, '[data-testid^="target-grid-"]', 'Alice').first().click();
  await shot(page, 'ipad-nuit-deux-colonnes');
});
