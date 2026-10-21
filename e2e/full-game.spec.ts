import { expect, test } from '@playwright/test';
import { collectErrors, confirmDialog, createManualGame, id, nightStep, openApp, tap, visible } from './helpers';

const PLAYERS: [string, string][] = [
  ['Alice', 'loup-garou'],
  ['Bruno', 'voyante'],
  ['Chloé', 'sorciere'],
  ['David', 'villageois'],
  ['Emma', 'villageois'],
];

test('partie complète jusqu’à la victoire du village, avec rechargement en cours de partie', async ({ page }) => {
  const errors = collectErrors(page);
  await openApp(page);
  await createManualGame(page, PLAYERS, { name: 'Soirée test' });
  await expect(visible(page, 'div', 'Soirée test').last()).toBeVisible();

  // Nuit 1
  await tap(page, 'open-night');
  await expect(id(page, 'wake-script')).toContainText('Voyante');
  await visible(page, '[data-testid^="target-grid-"]', 'Alice').first().click();
  await expect(id(page, 'seer-result')).toContainText('Loup-Garou');
  await tap(page, 'submit-step');
  await expect(id(page, 'wake-script')).toContainText('Loups-Garous');
  await nightStep(page, 'David');
  await expect(id(page, 'witch-victims')).toHaveText('David');
  await tap(page, 'submit-step');
  await expect(id(page, 'night-summary')).toBeVisible();
  await tap(page, 'resolve-night');
  await confirmDialog(page);
  await expect(id(page, 'dawn-announce')).toContainText('David');
  await expect(id(page, 'dawn-announce')).toContainText('Simple Villageois');

  // Rechargement complet de la page : la partie doit reprendre à l'identique.
  await page.reload();
  await expect(id(page, 'dawn-announce')).toContainText('David');
  // Fermeture puis réouverture de l'application à l'accueil.
  await page.goto('/');
  await expect(id(page, 'resume-card')).toContainText('Soirée test');
  await expect(id(page, 'resume-card')).toContainText('Aube 1');
  await tap(page, 'resume-game');
  await tap(page, 'open-dawn');
  await expect(id(page, 'dawn-announce')).toContainText('David');
  await tap(page, 'start-day');
  await confirmDialog(page);

  // Élection du maire : Bruno 3 voix
  await tap(page, 'open-mayor');
  await tap(page, 'open-ballot');
  const bruno = visible(page, '[data-testid^="vote-row-"]', 'Bruno');
  for (let i = 0; i < 3; i++) await bruno.locator('[data-testid^="vote-plus-"]').click();
  await expect(id(page, 'leader-text')).toHaveText('En tête : Bruno (3)');
  await expect(id(page, 'stat-remaining')).toHaveText('1');
  await tap(page, 'close-ballot');
  await confirmDialog(page);
  await expect(id(page, 'ballot-result')).toContainText('Bruno est élu(e) maire');
  await tap(page, 'confirm-ballot');
  await confirmDialog(page);
  await expect(id(page, 'ballot-done')).toBeVisible();

  // Vote d'élimination : une voix + vote du maire (compte double) contre Alice, une voix contre Emma.
  await tap(page, 'goto-elimination');
  await tap(page, 'open-ballot');
  await visible(page, '[data-testid^="vote-row-"]', 'Alice').locator('[data-testid^="vote-plus-"]').click();
  await visible(page, '[data-testid^="vote-row-"]', 'Emma').locator('[data-testid^="vote-plus-"]').click();
  await expect(id(page, 'leader-text')).toContainText('Égalité');
  await tap(page, 'mayor-vote');
  await visible(page, '[data-testid^="mayor-vote-grid-"]', 'Alice').click();
  await expect(id(page, 'leader-text')).toHaveText('En tête : Alice (3)');
  await tap(page, 'close-ballot');
  await confirmDialog(page);
  await tap(page, 'confirm-ballot');
  await confirmDialog(page);
  await tap(page, 'back-dashboard');
  await expect(id(page, 'phase-card')).toContainText('Victoire : Le Village');
  await tap(page, 'finish-game');
  await confirmDialog(page);
  await expect(visible(page, 'div', 'Le Village').first()).toBeVisible();
  await expect(id(page, 'summary-stats')).toBeVisible();

  // Statistiques et historique
  await tap(page, 'summary-home');
  await tap(page, 'tile-stats');
  await expect(id(page, 'stats-wins')).toContainText('Le Village');
  await page.goBack();
  await tap(page, 'tile-games');
  await expect(visible(page, 'div', 'Victoire : Le Village').last()).toBeVisible();
  expect(errors).toEqual([]);
});
