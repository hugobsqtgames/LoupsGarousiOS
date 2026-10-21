import { expect, test, type Page } from '@playwright/test';
import { confirmDialog, createManualGame, id, openApp, tap, visible } from './helpers';

/**
 * Captures d'écran RÉELLES de l'application (export web exécuté dans
 * Chromium, viewport iPhone 390 × 844 @2x). Lancement : SCREENSHOTS=1 npx playwright test e2e/screenshots.spec.ts
 * Résultat : docs/screenshots/web/*.png
 */
test.skip(!process.env.SCREENSHOTS, 'Captures uniquement sur demande (SCREENSHOTS=1)');

const DIR = 'docs/screenshots/web';
let n = 0;
async function shot(page: Page, name: string, fullPage = false) {
  await page.waitForTimeout(450);
  n += 1;
  await page.screenshot({ path: `${DIR}/${String(n).padStart(2, '0')}-${name}.png`, fullPage });
}

const PLAYERS: [string, string][] = [
  ['Alice', 'loup-garou'],
  ['Bruno', 'loup-garou'],
  ['Chloé', 'voyante'],
  ['David', 'sorciere'],
  ['Emma', 'chasseur'],
  ['Farid', 'cupidon'],
  ['Gaëlle', 'salvateur'],
  ['Hugo', 'villageois'],
  ['Inès', 'petite-fille'],
  ['Jules', 'villageois'],
];

async function pick(page: Page, prefix: string, name: string) {
  await visible(page, `[data-testid^="${prefix}-"]`, name).first().click();
}

test('captures des écrans principaux', async ({ page }) => {
  test.setTimeout(300_000);
  await openApp(page);
  await shot(page, 'accueil-vide');

  // Assistant de création (composition automatique pour illustrer, puis partie manuelle)
  await tap(page, 'new-game');
  for (const [name] of PLAYERS) {
    await id(page, 'player-name-input').fill(name);
    await id(page, 'player-name-input').press('Enter');
  }
  await shot(page, 'creation-joueurs');
  await tap(page, 'next-step');
  await tap(page, 'auto-compose');
  await shot(page, 'creation-composition-auto');
  await page.mouse.wheel(0, 900);
  await shot(page, 'creation-choix-cartes');
  await tap(page, 'next-step');
  await id(page, 'toggle-reveal-assign').click();
  await shot(page, 'creation-attribution');
  await tap(page, 'next-step');
  await shot(page, 'creation-variantes');
  await tap(page, 'next-step');
  await shot(page, 'creation-recapitulatif');
  await tap(page, 'save-favorite');
  await id(page, 'favorite-name').fill('Classique à 10');
  await tap(page, 'confirm-save-favorite');
  await tap(page, 'reset-draft');
  await confirmDialog(page);
  await page.goto('/');

  await createManualGame(page, PLAYERS, { name: 'Soirée du vendredi' });
  await shot(page, 'tableau-de-bord-nuit');
  await tap(page, 'open-night');
  await shot(page, 'nuit-cupidon');
  await pick(page, 'multi-grid', 'Hugo');
  await pick(page, 'multi-grid', 'Inès');
  await tap(page, 'submit-step');
  await tap(page, 'submit-step'); // Amoureux
  await pick(page, 'target-grid', 'Chloé');
  await tap(page, 'submit-step'); // Salvateur
  await pick(page, 'target-grid', 'Alice');
  await shot(page, 'nuit-voyante-resultat');
  await tap(page, 'submit-step');
  await pick(page, 'target-grid', 'Jules');
  await shot(page, 'nuit-loups');
  await tap(page, 'submit-step');
  await shot(page, 'nuit-sorciere');
  await tap(page, 'submit-step');
  await shot(page, 'nuit-recapitulatif');
  await tap(page, 'resolve-night');
  await confirmDialog(page);
  await id(page, 'toggle-dawn-details').click();
  await shot(page, 'aube-bilan');
  await tap(page, 'start-day');
  await confirmDialog(page);
  await shot(page, 'tableau-de-bord-jour');

  // Élection du maire
  await tap(page, 'open-mayor');
  for (const c of ['Chloé', 'Emma']) await pick(page, 'candidate-grid', c);
  await shot(page, 'maire-candidats');
  await tap(page, 'open-ballot');
  for (const [who, k] of [['Chloé', 5], ['Emma', 3]] as const) {
    for (let i = 0; i < k; i++) await visible(page, '[data-testid^="vote-row-"]', who).locator('[data-testid^="vote-plus-"]').click();
  }
  await shot(page, 'maire-scrutin');
  await tap(page, 'close-ballot');
  await confirmDialog(page);
  await tap(page, 'confirm-ballot');
  await confirmDialog(page);

  // Vote d'élimination (compteur)
  await tap(page, 'goto-elimination');
  await shot(page, 'vote-ouverture');
  await tap(page, 'open-ballot');
  for (const [who, k] of [['Alice', 4], ['Bruno', 2], ['Emma', 1]] as const) {
    for (let i = 0; i < k; i++) await visible(page, '[data-testid^="vote-row-"]', who).locator('[data-testid^="vote-plus-"]').click();
  }
  await tap(page, 'mayor-vote');
  await pick(page, 'mayor-vote-grid', 'Alice');
  await shot(page, 'vote-compteurs');
  await tap(page, 'close-ballot');
  await confirmDialog(page);
  await shot(page, 'vote-resultat');
  await tap(page, 'confirm-ballot');
  await confirmDialog(page);
  await tap(page, 'back-dashboard');

  // Fiche joueur, historique
  await visible(page, 'div', 'Chloé').last().click();
  await id(page, 'reveal-role').click();
  await shot(page, 'fiche-joueur');
  await page.goBack();
  await tap(page, 'open-history');
  await shot(page, 'historique-journal');
  await id(page, 'history-view-actions').click();
  await shot(page, 'historique-actions');
  await page.goBack();

  // Thèmes appliqués au tableau de bord
  for (const theme of ['foret', 'lune-de-sang', 'parchemin']) {
    await page.goto('/settings');
    await id(page, `theme-${theme}`).click();
    await page.goBack();
    await shot(page, `theme-${theme}`);
  }
  await page.goto('/settings');
  await id(page, 'theme-clair-de-lune').click();
  await id(page, 'discreet-toggle').click();
  await page.goBack();
  await shot(page, 'mode-discret');
  await page.goto('/settings');
  await id(page, 'discreet-toggle').click();
  await shot(page, 'parametres');
  await page.mouse.wheel(0, 700);
  await shot(page, 'parametres-audio');
  await page.goBack();

  // Nuit 2 jusqu'à la victoire : la meute tue Hugo (Inès meurt de chagrin), la Sorcière empoisonne Bruno.
  await page.goto('/');
  await tap(page, 'resume-game');
  await tap(page, 'end-day');
  await confirmDialog(page);
  await pick(page, 'target-grid', 'Gaëlle'); // Salvateur
  await tap(page, 'submit-step');
  await pick(page, 'target-grid', 'Bruno'); // Voyante
  await tap(page, 'submit-step');
  await pick(page, 'target-grid', 'Hugo'); // Loups
  await tap(page, 'submit-step');
  await pick(page, 'poison-grid', 'Bruno');
  await tap(page, 'submit-step');
  await tap(page, 'resolve-night');
  await confirmDialog(page);
  await tap(page, 'finish-from-dawn');
  await confirmDialog(page);
  await shot(page, 'resume-fin-de-partie');

  await tap(page, 'summary-home');
  await shot(page, 'accueil-favoris');
  await tap(page, 'tile-stats');
  await shot(page, 'statistiques');
  await page.goBack();
  await tap(page, 'tile-roles');
  await shot(page, 'catalogue-roles');
  await tap(page, 'catalog-sorciere');
  await shot(page, 'fiche-role');
  await page.goto('/roles/custom');
  await id(page, 'role-name').fill('Garde du corps');
  await shot(page, 'role-personnalise');
  await page.goto('/help');
  await shot(page, 'aide');
  await page.goto('/settings/data');
  await shot(page, 'donnees-locales');
  await expect(page.locator('body')).not.toBeEmpty();
});
