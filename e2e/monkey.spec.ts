import { expect, test, type Page } from '@playwright/test';
import { collectErrors, openApp, tap, id } from './helpers';

/**
 * « Monkey testing » de l'interface : appuis aléatoires (graine reproductible)
 * sur les contrôles visibles, saisies aléatoires, retours arrière et
 * navigation brutale. Après chaque geste : aucune erreur JavaScript et un
 * écran toujours rendu. Rejouer un échec : MONKEY_SEED=<graine>.
 */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLICKABLE = '[role="button"]:not([aria-disabled="true"]), [role="checkbox"]:not([aria-disabled="true"]), [role="radio"], [role="switch"], [role="tab"]';
const STEPS = Number(process.env.MONKEY_STEPS ?? 250);
const SEEDS = process.env.MONKEY_SEED ? [Number(process.env.MONKEY_SEED)] : [11, 23, 37];

async function seedGame(page: Page) {
  await tap(page, 'new-game');
  for (const n of ['Ana', 'Ben', 'Cléo', 'Dan', 'Eva', 'Fio', 'Gus', 'Hel', 'Ivy']) {
    await id(page, 'player-name-input').fill(n);
    await id(page, 'player-name-input').press('Enter');
  }
  await tap(page, 'next-step');
  await id(page, 'complexity-riche').click();
  await tap(page, 'auto-compose');
  for (let i = 0; i < 3; i++) await tap(page, 'next-step');
  await tap(page, 'launch-game');
  await id(page, 'dialog-confirm').click();
  await expect(id(page, 'phase-card')).toBeVisible();
}

for (const seed of SEEDS) {
  test(`monkey test de l’interface — graine ${seed}`, async ({ page }) => {
    test.setTimeout(STEPS * 2500 + 60_000);
    const errors = collectErrors(page);
    const random = rng(seed);
    const clicked = new Set<string>();
    page.on('dialog', (d) => void d.dismiss());
    page.on('filechooser', () => undefined);
    await openApp(page);
    await seedGame(page);
    for (let step = 0; step < STEPS; step++) {
      const r = random();
      if (r < 0.04) await page.goBack().catch(() => undefined);
      else if (r < 0.06) await page.goto('/');
      else {
        const inputs = page.locator('input:visible, textarea:visible');
        if (r < 0.12 && (await inputs.count()) > 0) {
          const k = Math.floor(random() * (await inputs.count()));
          await inputs.nth(k).fill(['', 'Zoé', 'x'.repeat(40), 'Ana', '  ', 'Loup'][Math.floor(random() * 6)]).catch(() => undefined);
          await inputs.nth(k).press('Enter').catch(() => undefined);
        } else {
          const candidates = page.locator(CLICKABLE).filter({ visible: true });
          const n = await candidates.count();
          if (n === 0) continue;
          const el = candidates.nth(Math.floor(random() * n));
          const tid = (await el.getAttribute('data-testid').catch(() => null)) ?? (await el.getAttribute('aria-label').catch(() => null)) ?? '?';
          clicked.add(tid);
          await el.click({ timeout: 2000, trial: false }).catch(() => undefined);
        }
      }
      // Laisse parfois passer le délai anti-double-appui, parfois non (appuis en rafale).
      await page.waitForTimeout(random() < 0.5 ? 30 : 480);
      // Un rechargement affiche brièvement un écran vide (chargement) : seul un écran durablement vide est une erreur.
      await expect
        .poll(async () => (await page.locator('body').innerText().catch(() => '')).trim().length, { message: `écran vide à l’étape ${step} (graine ${seed})`, timeout: 5000 })
        .toBeGreaterThan(0);
      expect(errors, `erreur JavaScript à l’étape ${step} (graine ${seed})`).toEqual([]);
    }
    test.info().annotations.push({ type: 'couverture', description: `${clicked.size} contrôles distincts touchés` });
    console.log(`graine ${seed} : ${STEPS} gestes, ${clicked.size} contrôles distincts`);
  });
}
