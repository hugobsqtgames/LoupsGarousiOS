import { expect, type Page } from '@playwright/test';

/** Élément visible (les écrans précédents de la pile restent dans le DOM, masqués). */
export const id = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });
export const visible = (page: Page, selector: string, hasText?: string) => page.locator(selector, hasText ? { hasText } : undefined).filter({ visible: true });

/** Les boutons ignorent les appuis répétés à moins de 450 ms : on espace légèrement les actions. */
export async function tap(page: Page, testId: string) {
  await id(page, testId).first().click();
  await page.waitForTimeout(480);
}

export async function confirmDialog(page: Page) {
  await id(page, 'dialog-confirm').click();
  await page.waitForTimeout(480);
}

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}

export async function openApp(page: Page) {
  await page.goto('/');
  await expect(id(page, 'new-game')).toBeVisible();
}

/** Crée une partie avec attribution manuelle des cartes (déterministe). */
export async function createManualGame(page: Page, players: [string, string][], opts: { name?: string; toggles?: string[] } = {}) {
  await tap(page, 'new-game');
  for (const [name] of players) {
    await id(page, 'player-name-input').fill(name);
    await id(page, 'player-name-input').press('Enter');
  }
  await tap(page, 'next-step');
  const counts = new Map<string, number>();
  for (const [, role] of players) counts.set(role, (counts.get(role) ?? 0) + 1);
  for (const [role, n] of counts) {
    for (let i = 0; i < n; i++) await id(page, `role-count-${role}-plus`).click();
  }
  await expect(id(page, 'card-count')).toHaveText(`${players.length} / ${players.length}`);
  await tap(page, 'next-step');
  await id(page, 'assign-mode-manual').click();
  for (let i = 0; i < players.length; i++) {
    await id(page, `assign-${i}`).click();
    await id(page, `role-picker-${players[i][1]}`).click();
    await page.waitForTimeout(150);
  }
  await tap(page, 'next-step');
  for (const t of opts.toggles ?? []) {
    await id(page, `variant-${t}-toggle`).click();
    await page.waitForTimeout(150);
  }
  await tap(page, 'next-step');
  if (opts.name) await id(page, 'game-name').fill(opts.name);
  await expect(id(page, 'issues-ok').or(id(page, 'issues-panel'))).toBeVisible();
  await tap(page, 'launch-game');
  await confirmDialog(page);
  await expect(id(page, 'phase-card')).toBeVisible();
}

/** Valide l'étape de nuit courante après avoir choisi une cible (par nom) ou « aucune ». */
export async function nightStep(page: Page, target: string | null) {
  if (target === null) await id(page, 'no-target').click();
  else await visible(page, '[data-testid^="target-grid-"]', target).first().click();
  await tap(page, 'submit-step');
}
