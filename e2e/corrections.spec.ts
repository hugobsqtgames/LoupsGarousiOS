import { expect, test } from '@playwright/test';
import { collectErrors, confirmDialog, createManualGame, id, nightStep, openApp, tap, visible } from './helpers';

const PLAYERS: [string, string][] = [
  ['Alice', 'loup-garou'],
  ['Bruno', 'chasseur'],
  ['Chloé', 'cupidon'],
  ['David', 'villageois'],
  ['Emma', 'villageois'],
  ['Farid', 'villageois'],
];

test('chaîne Amoureux + Chasseur, correction d’une étape de nuit, annulation et retour arrière', async ({ page }) => {
  const errors = collectErrors(page);
  await openApp(page);
  await createManualGame(page, PLAYERS);
  await tap(page, 'open-night');

  // Cupidon unit Bruno (Chasseur) et David.
  await expect(id(page, 'wake-script')).toContainText('Cupidon');
  await visible(page, '[data-testid^="multi-grid-"]', 'Bruno').click();
  await visible(page, '[data-testid^="multi-grid-"]', 'David').click();
  await tap(page, 'submit-step');
  await expect(id(page, 'wake-script')).toContainText('Amoureux');
  await tap(page, 'submit-step');
  // Les loups désignent d'abord Emma…
  await nightStep(page, 'Emma');
  // … puis le MJ corrige : retour sur l'étape des loups via la frise.
  await visible(page, '[data-testid^="timeline-"]', 'Loups').click();
  await expect(page.getByText('Correction d’une étape déjà validée')).toBeVisible();
  await visible(page, '[data-testid^="target-grid-"]', 'David').click();
  await tap(page, 'submit-step');
  await expect(id(page, 'night-summary')).toContainText('David');
  await tap(page, 'resolve-night');
  await confirmDialog(page);

  // David meurt, Bruno meurt de chagrin, le Chasseur doit tirer.
  await expect(id(page, 'dawn-announce')).toContainText('David');
  await expect(id(page, 'dawn-announce')).toContainText('Bruno');
  await expect(id(page, 'decision-panel')).toContainText('Chasseur');
  await expect(id(page, 'start-day')).toBeDisabled();
  await visible(page, '[data-testid^="decision-grid-"]', 'Alice').click();
  await tap(page, 'decision-confirm');
  await confirmDialog(page);
  // Alice (seule louve) meurt : victoire du village détectée seulement après le tir.
  await expect(id(page, 'dawn-victory')).toContainText('Le Village');

  // Annulation de la dernière action (le tir) depuis le tableau de bord.
  await page.goto(page.url().replace(/\/dawn$/, ''));
  await tap(page, 'undo');
  await confirmDialog(page);
  await expect(id(page, 'phase-card')).toContainText('Une décision est en attente');

  // Retour arrière : avant la résolution de la nuit.
  await tap(page, 'open-history');
  await id(page, 'history-view-actions').click();
  const resolveRow = visible(page, '[data-testid^="action-"]:not([data-testid="action-log"])', 'Résolution de la nuit');
  await resolveRow.locator('[data-testid^="rewind-"]').click();
  await confirmDialog(page);
  await page.goBack();
  await expect(id(page, 'phase-card')).toContainText('Le village dort');
  expect(errors).toEqual([]);
});
