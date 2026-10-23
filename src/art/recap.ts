import { ROLE_GLYPHS } from './glyphs';

/**
 * Image récapitulative de fin de partie (SVG 1080 × 1350), partageable hors
 * ligne : vainqueurs, rôles révélés, moments clés. Aucune donnée n'est
 * envoyée : l'image est générée sur l'appareil puis confiée à la feuille de
 * partage du système.
 */

export interface RecapPlayer {
  name: string;
  roleName: string;
  glyph: string;
  team: 'village' | 'wolves' | 'solo';
  alive: boolean;
  winner: boolean;
}

export interface RecapData {
  title: string;
  winnerLabel: string;
  reason: string;
  nights: number;
  days: number;
  date: string;
  players: RecapPlayer[];
  moments: string[];
}

const W = 1080;
const H = 1350;
const TEAM = { village: '#d9b25f', wolves: '#e0574a', solo: '#a879f0' };

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function clip(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Découpe un texte en lignes d'au plus `max` caractères (sur les espaces). */
export function wrapText(s: string, max: number, maxLines: number): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line ? `${line} ${w}` : w).length > max && line) {
      lines.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = clip(`${kept[maxLines - 1]} …`, max);
    return kept;
  }
  return lines;
}

export function glyphFor(icon: string): string {
  return (ROLE_GLYPHS as Record<string, string>)[icon] ?? ROLE_GLYPHS.custom;
}

export function recapSvg(d: RecapData): string {
  const font = 'font-family="Georgia, \'Times New Roman\', serif"';
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  out += `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1124"/><stop offset="1" stop-color="#1c2140"/></linearGradient>`;
  out += `<radialGradient id="moon"><stop offset="0" stop-color="#f6efd9" stop-opacity="0.35"/><stop offset="1" stop-color="#f6efd9" stop-opacity="0"/></radialGradient></defs>`;
  out += `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
  out += `<circle cx="900" cy="150" r="220" fill="url(#moon)"/><circle cx="900" cy="150" r="70" fill="#f6efd9"/>`;
  out += `<rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="36" fill="none" stroke="#d9b25f" stroke-width="4"/>`;
  out += `<text x="80" y="120" ${font} font-size="34" fill="#c9c3b0" letter-spacing="4">LOUPS-GAROUS · RÉCAPITULATIF</text>`;
  out += `<text x="80" y="190" ${font} font-size="54" font-weight="bold" fill="#fff1cf">${esc(clip(d.title, 30))}</text>`;
  out += `<text x="80" y="240" ${font} font-size="30" fill="#c9c3b0">${esc(`${d.date} · ${d.nights} nuit(s) · ${d.days} jour(s) · ${d.players.length} joueurs`)}</text>`;
  out += `<rect x="80" y="280" width="${W - 160}" height="150" rx="24" fill="#d9b25f"/>`;
  out += `<text x="${W / 2}" y="350" text-anchor="middle" ${font} font-size="54" font-weight="bold" fill="#1a1406">${esc(`Victoire : ${clip(d.winnerLabel, 26)}`)}</text>`;
  wrapText(d.reason, 52, 1).forEach((l, i) => {
    out += `<text x="${W / 2}" y="${400 + i * 34}" text-anchor="middle" ${font} font-size="30" fill="#2a2210">${esc(l)}</text>`;
  });
  // Joueurs : grille 3 colonnes.
  const cols = 3;
  const cellW = (W - 160) / cols;
  const rows = Math.ceil(d.players.length / cols);
  const cellH = Math.min(96, Math.floor(560 / Math.max(1, rows)));
  const top = 470;
  d.players.forEach((p, i) => {
    const x = 80 + (i % cols) * cellW;
    const y = top + Math.floor(i / cols) * cellH;
    const c = TEAM[p.team];
    const s = Math.min(1.9, (cellH - 16) / 24);
    out += `<g opacity="${p.alive ? 1 : 0.55}">`;
    out += `<rect x="${x + 4}" y="${y + 4}" width="${cellW - 8}" height="${cellH - 8}" rx="16" fill="#151a33" stroke="${p.winner ? '#d9b25f' : '#2b3157'}" stroke-width="${p.winner ? 3 : 1.5}"/>`;
    out += `<path d="${glyphFor(p.glyph)}" transform="translate(${x + 18} ${y + (cellH - 24 * s) / 2}) scale(${s.toFixed(2)})" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    const fs = cellH >= 80 ? 28 : 22;
    out += `<text x="${x + 24 + 24 * s}" y="${y + cellH / 2 - 2}" ${font} font-size="${fs}" font-weight="bold" fill="#f2ecdc"${p.alive ? '' : ' text-decoration="line-through"'}>${esc(clip(p.name, 13))}</text>`;
    out += `<text x="${x + 24 + 24 * s}" y="${y + cellH / 2 + fs - 2}" ${font} font-size="${fs - 6}" fill="${c}">${esc(clip(p.roleName, 18))}</text>`;
    out += `</g>`;
  });
  // Moments clés.
  const mTop = Math.min(H - 330, top + rows * cellH + 40);
  out += `<text x="80" y="${mTop}" ${font} font-size="34" fill="#d9b25f" letter-spacing="2">MOMENTS CLÉS</text>`;
  const room = Math.max(1, Math.floor((H - 80 - (mTop + 20)) / 40));
  d.moments.slice(0, room).forEach((m, i) => {
    out += `<text x="80" y="${mTop + 50 + i * 40}" ${font} font-size="28" fill="#e6e0cf">• ${esc(clip(m, 62))}</text>`;
  });
  out += `<text x="${W / 2}" y="${H - 48}" text-anchor="middle" ${font} font-size="22" fill="#7d7a8f">Généré hors ligne par Loups-Garous MJ</text>`;
  out += `</svg>`;
  return out;
}
