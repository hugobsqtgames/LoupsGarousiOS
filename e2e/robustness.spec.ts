import { expect, test } from '@playwright/test';
import { collectErrors, confirmDialog, createManualGame, id, nightStep, openApp, tap } from './helpers';

/**
 * Robustesse (audit QA) : liens invalides, appuis répétés, rechargement en
 * plein parcours. Vérifie les résultats observables, pas seulement l'absence d'erreur.
 */
const PLAYERS: [string, string][] = [
  ['Alice', 'loup-garou'],
  ['Bruno', 'voyante'],
  ['Chloé', 'villageois'],
  ['David', 'villageois'],
  ['Emma', 'villageois'],
];

test('liens invalides : chaque écran affiche un message et une sortie', async ({ page }) => {
  const errors = collectErrors(page);
  await openApp(page);
  await page.goto('/game/inexistante');
  await expect(page.getByText('Partie illisible')).toBeVisible();
  await expect(page.getByText(/introuvable/)).toBeVisible();
  await page.getByText('Retour à l’accueil').click();
  await expect(id(page, 'new-game')).toBeVisible();
  await page.goto('/roles/role-qui-n-existe-pas');
  await expect(page.getByText('Rôle introuvable')).toBeVisible();
  await page.goto('/une/adresse/inconnue');
  await expect(id(page, 'not-found')).toBeVisible();
  await tap(page, 'not-found-home');
  await expect(id(page, 'new-game')).toBeVisible();
  await createManualGame(page, PLAYERS);
  const gameUrl = page.url();
  await page.goto(`${gameUrl.replace(/\/$/, '')}/player/zzz`);
  await expect(page.getByText('Joueur introuvable')).toBeVisible();
  expect(errors.filter((e) => !/404|Failed to load resource/.test(e))).toEqual([]);
});

test('appuis répétés très rapides : une seule résolution de nuit, aucun état incohérent', async ({ page }) => {
  const errors = collectErrors(page);
  await openApp(page);
  await createManualGame(page, PLAYERS);
  await tap(page, 'open-night');
  await nightStep(page, 'Alice');
  // Triple appui instantané sur « Valider » de l'étape des loups.
  await page.locator('[data-testid^="target-grid-"]', { hasText: 'David' }).filter({ visible: true }).first().click();
  const submit = id(page, 'submit-step').first();
  await submit.click();
  await submit.click({ force: true, timeout: 1000 }).catch(() => undefined);
  await submit.click({ force: true, timeout: 1000 }).catch(() => undefined);
  await page.waitForTimeout(500);
  const resolve = id(page, 'resolve-night').first();
  await resolve.click();
  await resolve.click({ force: true, timeout: 1000 }).catch(() => undefined);
  await page.waitForTimeout(500);
  // Un seul dialogue de confirmation, une seule aube.
  await expect(id(page, 'dialog')).toHaveCount(1);
  await confirmDialog(page);
  await expect(id(page, 'dawn-story')).toContainText('David');
  await tap(page, 'start-day');
  await confirmDialog(page);
  await tap(page, 'open-history');
  await id(page, 'history-view-actions').click();
  await expect(id(page, 'action-log').getByText('Résolution de la nuit', { exact: true })).toHaveCount(1);
  // Voyante, Loups, résolution, début du jour : exactement 4 actions.
  await expect(id(page, 'action-log').locator('[data-testid^="action-"]')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('rechargement en pleine configuration : le brouillon est restauré', async ({ page }) => {
  const errors = collectErrors(page);
  await openApp(page);
  await tap(page, 'new-game');
  for (const n of ['Zoé', 'Yann', 'Xavier']) {
    await id(page, 'player-name-input').fill(n);
    await id(page, 'player-name-input').press('Enter');
  }
  await page.waitForTimeout(900);
  await page.reload();
  await expect(id(page, 'new-game').or(id(page, 'player-name-input'))).toBeVisible();
  if (await id(page, 'new-game').count()) await tap(page, 'new-game');
  for (const n of ['Zoé', 'Yann', 'Xavier']) await expect(page.getByText(n).filter({ visible: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('rechargement juste après une action : l’action est conservée', async ({ page }) => {
  const errors = collectErrors(page);
  await openApp(page);
  await createManualGame(page, PLAYERS);
  await tap(page, 'open-night');
  await nightStep(page, 'Alice');
  await nightStep(page, 'Emma');
  await tap(page, 'resolve-night');
  await confirmDialog(page);
  await page.waitForTimeout(300);
  await page.reload();
  await expect(id(page, 'dawn-story').or(id(page, 'phase-card'))).toBeVisible();
  await expect(page.getByText(/Emma/).filter({ visible: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});
