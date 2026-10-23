// Convertit les illustrations SVG des rôles en PNG (Chromium via Playwright),
// puis assemble une planche récapitulative.
//   ROLE_ART_OUT=<dossier svg> npx jest src/art   (export des SVG)
//   node scripts/render-role-art.mjs <dossier svg> <dossier png>
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const [src, dest] = process.argv.slice(2);
if (!src || !dest) {
  console.error('Usage : node scripts/render-role-art.mjs <dossier svg> <dossier png>');
  process.exit(1);
}
fs.mkdirSync(dest, { recursive: true });
const files = fs.readdirSync(src).filter((f) => f.endsWith('.svg')).sort();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 600, height: 800 }, deviceScaleFactor: 1 });
for (const f of files) {
  const svg = fs.readFileSync(path.join(src, f), 'utf8').replace('width="300" height="400"', 'width="600" height="800"');
  await page.setContent(`<html><body style="margin:0;background:#0b0d16">${svg}</body></html>`);
  await page.locator('svg').screenshot({ path: path.join(dest, f.replace('.svg', '.png')), omitBackground: true });
}
// Planche : 8 colonnes.
const cols = 8;
const cells = files.map((f) => `<div style="width:150px;height:200px">${fs.readFileSync(path.join(src, f), 'utf8').replace('width="300" height="400"', 'width="150" height="200"')}</div>`);
await page.setViewportSize({ width: cols * 158 + 16, height: Math.ceil(files.length / cols) * 208 + 16 });
await page.setContent(`<html><body style="margin:0;padding:8px;background:#0b0d16;display:flex;flex-wrap:wrap;gap:8px">${cells.join('')}</body></html>`);
await page.screenshot({ path: path.join(dest, '_planche.png'), fullPage: true });
await browser.close();
console.log(`${files.length} illustrations rendues dans ${dest}`);
