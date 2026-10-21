#!/usr/bin/env node
/** Rend la planche de maquettes HTML en PNG (planche complète + une image par écran). */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'docs', 'mockups');
mkdirSync(join(out, 'screens'), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1900, height: 1200 }, deviceScaleFactor: 1 });
await page.goto(`file://${join(out, 'board.html')}`);
await page.waitForTimeout(500);
await page.locator('#board').screenshot({ path: join(out, 'board.png') });
const frames = page.locator('.frame');
const count = await frames.count();
for (let i = 0; i < count; i++) {
  const label = await frames.nth(i).locator('.label').innerText();
  const slug = label.replace(/^Maquette · /i, '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  await frames.nth(i).locator('.phone').screenshot({ path: join(out, 'screens', `${slug}.png`) });
}
console.log(`${count} maquettes rendues`);
await browser.close();
