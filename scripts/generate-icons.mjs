#!/usr/bin/env node
/** Génère l'icône et les images de démarrage à partir d'un SVG (lune + silhouette de loup). */
import { chromium } from '@playwright/test';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(fileURLToPath(new URL('..', import.meta.url)), 'assets', 'images');
const wolf = 'M4 3l4.5 5L12 6.5 15.5 8 20 3l-.8 8.5L15 16l-3 5-3-5-4.2-4.5L4 3z';
const art = (bg, fg, moon, halo) => `
  ${bg ? `<defs><radialGradient id="g" cx="0.5" cy="0.35" r="0.75"><stop offset="0" stop-color="#26305A"/><stop offset="1" stop-color="#0A0F1E"/></radialGradient>
  <radialGradient id="h" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${moon}" stop-opacity="${halo}"/><stop offset="1" stop-color="${moon}" stop-opacity="0"/></radialGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/><circle cx="512" cy="430" r="400" fill="url(#h)"/>` : ''}
  <circle cx="512" cy="430" r="250" fill="${moon}"/>
  <g transform="translate(212 300) scale(25)"><path d="${wolf}" fill="${fg}"/>
  <path d="M9 11.5l1.6.8M15 11.5l-1.6.8" stroke="${moon}" stroke-width="0.9" stroke-linecap="round"/></g>
  ${bg ? '<path d="M0 900 L90 820 L150 870 L230 760 L300 860 L380 800 L460 880 L540 790 L620 870 L700 770 L780 860 L860 800 L940 870 L1024 820 L1024 1024 L0 1024 Z" fill="#05080F"/>' : ''}`;
const svg = (content, size = 1024) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${content}</svg>`;
const browser = await chromium.launch();
async function render(name, content, size, transparent) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0;background:${transparent ? 'transparent' : '#0A0F1E'}">${svg(content, size)}</body></html>`);
  await page.screenshot({ path: join(out, name), omitBackground: transparent });
  await page.close();
}
await render('icon.png', art(true, '#0A0F1E', '#F3E7C9', 0.35), 1024, false);
await render('splash-icon.png', art(false, '#0A0F1E', '#F3E7C9', 0), 1024, true);
await render('android-icon-foreground.png', art(false, '#0A0F1E', '#F3E7C9', 0), 512, true);
await render('android-icon-background.png', '<rect width="1024" height="1024" fill="#0A0F1E"/>', 512, false);
await render('android-icon-monochrome.png', art(false, '#000000', '#FFFFFF', 0), 512, true);
await render('favicon.png', art(true, '#0A0F1E', '#F3E7C9', 0.35), 48, false);
await browser.close();
console.log('icônes générées');
