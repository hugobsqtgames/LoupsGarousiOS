import { createRng } from '@/engine';
import { recapSvg } from '../recap';
import { roleArtSvg } from '../role-art';

/**
 * Audit QA : les noms saisis (joueurs, partie, rôles personnalisés) sont
 * insérés dans du SVG. Quel que soit le texte, le document doit rester du XML
 * bien formé (sinon l'image de récapitulatif ne s'affiche pas).
 */
const ALPHABET = ['a', 'É', 'ß', ' ', '<', '>', '&', '"', "'", '🐺', '👩‍👩‍👧', '🇫🇷', '\u0001', '\u0000', '￿', 'ﷺ', '中', '\t', '\n', ';', '&amp;', ']]>', '<!--'];

function randomText(rng: () => number, max: number): string {
  let s = '';
  const n = Math.floor(rng() * max);
  for (let i = 0; i < n; i++) s += ALPHABET[Math.floor(rng() * ALPHABET.length)];
  return s;
}

function wellFormed(svg: string): string[] {
  const problems: string[] = [];
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(svg)) problems.push('demi-caractère (surrogate isolé)');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/.test(svg)) problems.push('caractère de contrôle');
  const text = svg.replace(/<[a-zA-Z/][^<>]*>/g, '');
  if (/[<>]/.test(text)) problems.push('chevron non échappé');
  if (/&(?!(amp|lt|gt|quot|apos);)/.test(text)) problems.push('esperluette non échappée');
  // Balises équilibrées.
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)[^<>]*?(\/?)>/g)) {
    if (m[3]) continue;
    if (m[1]) {
      if (stack.pop() !== m[2]) problems.push(`balise ${m[2]} mal fermée`);
    } else stack.push(m[2]);
  }
  if (stack.length) problems.push('balises non fermées');
  return problems;
}

describe.each(Array.from({ length: 300 }, (_, i) => i + 1))('texte aléatoire %i', (seed) => {
  it('récapitulatif et illustration restent du XML bien formé', () => {
    const rng = createRng(seed);
    const players = Array.from({ length: 5 + Math.floor(rng() * 20) }, () => ({ name: randomText(rng, 30), roleName: randomText(rng, 25), glyph: 'wolf', team: (['village', 'wolves', 'solo'] as const)[Math.floor(rng() * 3)], alive: rng() < 0.5, winner: rng() < 0.5 }));
    const svg = recapSvg({ title: randomText(rng, 60), winnerLabel: randomText(rng, 40), reason: randomText(rng, 120), nights: 3, days: 2, date: '24/10/2026', players, moments: [randomText(rng, 90), randomText(rng, 90)] });
    expect(wellFormed(svg)).toEqual([]);
    expect(wellFormed(roleArtSvg('loup-garou', { team: 'wolves', title: randomText(rng, 40) }))).toEqual([]);
  });
});
