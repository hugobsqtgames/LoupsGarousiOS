import { expect, test, type Page } from '@playwright/test';
import { collectErrors, confirmDialog, createManualGame, id, nightStep, openApp, tap, visible } from './helpers';

/** Appui long sur l'écran privé (révélation d'un rôle). */
async function holdReveal(page: Page) {
  await id(page, 'reveal-hold').click({ delay: 900 });
  await page.waitForTimeout(300);
}

async function createPhoneGame(page: Page, names: string[], roles: [string, number][]) {
  await tap(page, 'new-game');
  for (const n of names) {
    await id(page, 'player-name-input').fill(n);
    await id(page, 'player-name-input').press('Enter');
  }
  await tap(page, 'next-step');
  for (const [role, count] of roles) for (let i = 0; i < count; i++) await id(page, `role-count-${role}-plus`).click();
  await tap(page, 'next-step');
  await id(page, 'assign-mode-phone').click();
  await expect(id(page, 'center-cards')).toBeVisible();
  await tap(page, 'next-step');
  await tap(page, 'next-step');
  await tap(page, 'launch-game');
  await confirmDialog(page);
  await expect(id(page, 'phase-card')).toBeVisible();
}

test('distribution sur le téléphone et Voleur : cartes du centre découvertes en privé', async ({ page }) => {
  const errors = collectErrors(page);
  await openApp(page);
  const names = ['Ana', 'Ben', 'Cléa', 'Dan', 'Eli'];
  await createPhoneGame(page, names, [
    ['loup-garou', 1],
    ['voleur', 1],
    ['voyante', 1],
    ['villageois', 2],
  ]);

  // Chaque joueur découvre son rôle sur un écran privé.
  await tap(page, 'open-deal');
  const roles = new Map<string, string>();
  for (const n of names) {
    await expect(id(page, 'deal-next')).toContainText(n);
    await tap(page, 'deal-open');
    await expect(id(page, 'reveal-handoff')).toHaveText(`Passe le téléphone à ${n}`);
    // Un appui bref ne révèle rien.
    await id(page, 'reveal-hold').click();
    await expect(id(page, 'revealed-role-name')).toHaveCount(0);
    await holdReveal(page);
    roles.set(n, (await id(page, 'revealed-role-name').innerText()).trim());
    await tap(page, 'reveal-done');
  }
  await expect(id(page, 'deal-finished')).toBeVisible();
  const thief = [...roles].find(([, r]) => r === 'Voleur')?.[0];
  expect(thief).toBeTruthy();
  // Règle officielle (N+2) : le Loup-Garou peut se retrouver au centre, mais jamais plus d'un.
  expect([...roles.values()].filter((r) => r === 'Loup-Garou').length).toBeLessThanOrEqual(1);
  await tap(page, 'deal-back');

  // Nuit 1 : le Voleur voit les deux cartes du centre et en prend une.
  await tap(page, 'open-night');
  await expect(id(page, 'wake-script')).toContainText('Voleur');
  await tap(page, 'thief-phone');
  await expect(id(page, 'reveal-handoff')).toContainText(thief!);
  await holdReveal(page);
  const taken = (await id(page, 'thief-phone-take-0').innerText()).split('\n').pop()!.trim();
  await tap(page, 'thief-phone-take-0');
  await expect(id(page, 'thief-take-0')).toContainText(taken);
  await tap(page, 'submit-step');

  // Le Voleur revoit son nouveau rôle.
  await tap(page, 'back-button');
  await tap(page, 'review-role');
  await visible(page, '[data-testid^="review-grid-"]', thief!).click();
  await tap(page, 'deal-open');
  await holdReveal(page);
  await expect(id(page, 'revealed-role-name')).toHaveText(taken);
  await tap(page, 'reveal-done');
  expect(errors).toEqual([]);
});

test('vote à main levée, minuteur de débat, chronologie, plan de table et rejeu', async ({ page }) => {
  const errors = collectErrors(page);
  await openApp(page);
  await createManualGame(page, [
    ['Alice', 'loup-garou'],
    ['Bruno', 'voyante'],
    ['Chloé', 'villageois'],
    ['David', 'villageois'],
    ['Emma', 'villageois'],
    ['Fanny', 'villageois'],
  ]);
  await tap(page, 'open-night');
  await nightStep(page, 'Alice');
  await nightStep(page, 'David');
  await tap(page, 'resolve-night');
  await confirmDialog(page);
  await expect(id(page, 'dawn-story')).toContainText('David');
  await id(page, 'story-style-humour').click();
  await expect(id(page, 'dawn-story')).toContainText('David');
  await tap(page, 'start-day');
  await confirmDialog(page);

  // Minuteur : démarrage puis prolongation d'une minute.
  await expect(id(page, 'debate-timer')).toBeVisible();
  await tap(page, 'timer-start');
  await tap(page, 'timer-extend');
  await expect(id(page, 'timer-value')).toHaveText(/^3:5\d$/);
  await tap(page, 'timer-pause');

  // Élimination directe (maire ignoré) : 3 mains levées contre Alice, 1 contre Emma.
  await tap(page, 'open-vote');
  await tap(page, 'open-ballot');
  await id(page, 'tally-input-mode-hands').click();
  const aliceRow = visible(page, '[data-testid^="vote-row-"]', 'Alice');
  await aliceRow.locator('[data-testid^="vote-tap-"]').click();
  await tap(page, 'key-3');
  await tap(page, 'hands-submit');
  await expect(aliceRow.locator('[data-testid^="vote-count-"]')).toHaveText('3');
  await visible(page, '[data-testid^="vote-row-"]', 'Emma').locator('[data-testid^="vote-tap-"]').click();
  await tap(page, 'key-9');
  await expect(id(page, 'hands-value')).toHaveText('9');
  await expect(id(page, 'hands-submit')).toBeDisabled();
  await tap(page, 'key-back');
  await tap(page, 'key-1');
  await tap(page, 'hands-submit');
  await expect(id(page, 'stat-cast')).toHaveText('4');
  await tap(page, 'close-ballot');
  await confirmDialog(page);
  await tap(page, 'confirm-ballot');
  await confirmDialog(page);
  await tap(page, 'back-dashboard');

  // Chronologie.
  await tap(page, 'open-timeline');
  await expect(id(page, 'timeline-screen')).toContainText('Nuit 1');
  await expect(id(page, 'timeline-screen')).toContainText('David');
  await expect(id(page, 'timeline-screen')).toContainText('Vote du village');
  await tap(page, 'back-button');

  // Plan de table : voisins de Chloé (places 2 et 4 vivantes).
  await tap(page, 'open-table');
  await id(page, 'seat-' + (await seatId(page, 'Chloé'))).click();
  await expect(id(page, 'table-detail')).toContainText('Voisin de gauche (vivant) : Emma');
  await expect(id(page, 'table-detail')).toContainText('Voisin de droite (vivant) : Bruno');
  await tap(page, 'back-button');

  // Rejeu pas à pas depuis l'historique.
  await tap(page, 'open-history');
  await tap(page, 'history-replay');
  await expect(id(page, 'replay-position')).toHaveText(/^Action 0 sur \d+$/);
  await tap(page, 'replay-forward');
  await expect(id(page, 'replay-position')).toContainText('Action 1');
  await tap(page, 'replay-next-phase');
  await expect(id(page, 'replay-action')).toBeVisible();
  expect(errors).toEqual([]);
});

async function seatId(page: Page, name: string): Promise<string> {
  const el = visible(page, '[data-testid^="seat-"]', name).first();
  const tid = await el.getAttribute('data-testid');
  return tid!.replace('seat-', '');
}

test('iPad en paysage : guide de nuit et plateau des joueurs côte à côte', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  const errors = collectErrors(page);
  await openApp(page);
  await createManualGame(page, [
    ['Alice', 'loup-garou'],
    ['Bruno', 'voyante'],
    ['Chloé', 'sorciere'],
    ['David', 'villageois'],
    ['Emma', 'villageois'],
  ]);
  await expect(id(page, 'dashboard-board')).toBeVisible();
  await tap(page, 'open-night');
  await expect(id(page, 'night-board')).toBeVisible();
  const guide = await id(page, 'step-card').boundingBox();
  const board = await id(page, 'night-board').boundingBox();
  expect(board!.x).toBeGreaterThan(guide!.x + guide!.width - 1);
  expect(errors).toEqual([]);
});

test('Nouvelle Lune : tirage d’un événement le deuxième matin, grâce par Pile ou face', async ({ page }) => {
  const errors = collectErrors(page);
  await openApp(page);
  await createManualGame(
    page,
    [
      ['Alice', 'loup-garou'],
      ['Bruno', 'voyante'],
      ['Chloé', 'villageois'],
      ['David', 'villageois'],
      ['Emma', 'villageois'],
      ['Fanny', 'villageois'],
      ['Gaspard', 'villageois'],
    ],
    { toggles: ['newMoonEvents', 'mayorEnabled'] },
  );
  // Nuit 1, jour 1 sans tirage.
  await tap(page, 'open-night');
  await nightStep(page, null);
  await nightStep(page, 'Gaspard');
  await tap(page, 'resolve-night');
  await confirmDialog(page);
  await tap(page, 'start-day');
  await confirmDialog(page);
  await expect(id(page, 'events-panel')).not.toContainText('Tirage prévu');
  await tap(page, 'end-day');
  await confirmDialog(page);
  // Nuit 2.
  await nightStep(page, null);
  await nightStep(page, 'Fanny');
  await tap(page, 'resolve-night');
  await confirmDialog(page);
  await tap(page, 'start-day');
  await confirmDialog(page);
  await expect(id(page, 'events-panel')).toContainText('Tirage prévu ce matin');
  await tap(page, 'event-pick');
  await visible(page, '[data-testid^="event-deck-"]', 'Pile ou face').click();
  await expect(id(page, 'event-pile-ou-face')).toBeVisible();
  // Vote : David condamné, puis gracié.
  await tap(page, 'open-vote');
  await tap(page, 'open-ballot');
  await visible(page, '[data-testid^="vote-row-"]', 'David').locator('[data-testid^="vote-plus-"]').click();
  await tap(page, 'close-ballot');
  await confirmDialog(page);
  await expect(id(page, 'spare-panel')).toBeVisible();
  await tap(page, 'coin-flip');
  await expect(id(page, 'coin-result')).toBeVisible();
  await tap(page, 'spare-ballot');
  await confirmDialog(page);
  await tap(page, 'back-dashboard');
  await expect(visible(page, '[data-testid="player-p4"], [data-testid^="player-"]', 'David').first()).toBeVisible();
  await tap(page, 'open-timeline');
  await expect(id(page, 'timeline-screen')).toContainText('Événement : Pile ou face');
  expect(errors).toEqual([]);
});
