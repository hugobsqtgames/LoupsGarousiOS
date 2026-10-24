import { ROLE_GLYPHS } from './glyphs';

/**
 * Illustrations originales des rôles (identité visuelle propre à
 * l'application, aucune reprise des visuels du jeu édité).
 *
 * Chaque carte est une scène nocturne générée de façon déterministe : ciel,
 * étoiles, lune, collines, décor (village, forêt, clocher…), particules
 * propres au rôle, puis un médaillon central portant l'emblème du rôle.
 * Le même code produit le SVG affiché dans l'app (react-native-svg) et les
 * images exportées (scripts/render-role-art.mjs).
 */

export type ArtTeam = 'village' | 'wolves' | 'solo';
type Decor = 'village' | 'forest' | 'church' | 'fields' | 'ruins' | 'camp';
type Particle = 'stars' | 'hearts' | 'embers' | 'bubbles' | 'notes' | 'feathers' | 'leaves' | 'sparks' | 'snow' | 'petals';

interface ArtSpec {
  glyph: keyof typeof ROLE_GLYPHS;
  decor: Decor;
  particle: Particle;
  /** Décalage de teinte du ciel (degrés). */
  hue: number;
  moon: 'full' | 'crescent' | 'half' | 'blood' | 'none';
}

const SPECS: Record<string, ArtSpec> = {
  villageois: { glyph: 'villager', decor: 'village', particle: 'stars', hue: 0, moon: 'crescent' },
  'loup-garou': { glyph: 'wolf', decor: 'forest', particle: 'embers', hue: 0, moon: 'full' },
  voyante: { glyph: 'eye', decor: 'village', particle: 'sparks', hue: 30, moon: 'full' },
  sorciere: { glyph: 'potion', decor: 'forest', particle: 'bubbles', hue: -40, moon: 'crescent' },
  chasseur: { glyph: 'crosshair', decor: 'forest', particle: 'leaves', hue: 50, moon: 'half' },
  cupidon: { glyph: 'heart', decor: 'fields', particle: 'hearts', hue: -70, moon: 'crescent' },
  'petite-fille': { glyph: 'child', decor: 'village', particle: 'petals', hue: -20, moon: 'half' },
  voleur: { glyph: 'mask', decor: 'village', particle: 'stars', hue: 20, moon: 'none' },
  salvateur: { glyph: 'shield', decor: 'church', particle: 'sparks', hue: 60, moon: 'full' },
  ancien: { glyph: 'elder', decor: 'church', particle: 'snow', hue: 90, moon: 'half' },
  'bouc-emissaire': { glyph: 'goat', decor: 'fields', particle: 'leaves', hue: 110, moon: 'crescent' },
  idiot: { glyph: 'jester', decor: 'village', particle: 'petals', hue: -110, moon: 'crescent' },
  'joueur-de-flute': { glyph: 'flute', decor: 'ruins', particle: 'notes', hue: 0, moon: 'crescent' },
  corbeau: { glyph: 'raven', decor: 'church', particle: 'feathers', hue: 150, moon: 'full' },
  renard: { glyph: 'fox', decor: 'forest', particle: 'leaves', hue: 70, moon: 'half' },
  'montreur-ours': { glyph: 'bear', decor: 'camp', particle: 'embers', hue: 40, moon: 'crescent' },
  chevalier: { glyph: 'sword', decor: 'ruins', particle: 'sparks', hue: 130, moon: 'half' },
  'deux-soeurs': { glyph: 'sisters', decor: 'fields', particle: 'petals', hue: -60, moon: 'full' },
  'trois-freres': { glyph: 'brothers', decor: 'village', particle: 'stars', hue: 80, moon: 'full' },
  'enfant-sauvage': { glyph: 'leaf', decor: 'forest', particle: 'leaves', hue: 100, moon: 'crescent' },
  'chien-loup': { glyph: 'dog', decor: 'camp', particle: 'embers', hue: 25, moon: 'half' },
  servante: { glyph: 'servant', decor: 'church', particle: 'stars', hue: -30, moon: 'crescent' },
  'juge-begue': { glyph: 'gavel', decor: 'church', particle: 'sparks', hue: 10, moon: 'half' },
  ange: { glyph: 'angel', decor: 'fields', particle: 'feathers', hue: 0, moon: 'full' },
  'villageois-villageois': { glyph: 'star', decor: 'village', particle: 'sparks', hue: 45, moon: 'full' },
  'loup-blanc': { glyph: 'wolf-white', decor: 'ruins', particle: 'snow', hue: 0, moon: 'full' },
  'grand-mechant-loup': { glyph: 'wolf-big', decor: 'forest', particle: 'embers', hue: 15, moon: 'blood' },
  infect: { glyph: 'fang', decor: 'ruins', particle: 'embers', hue: -15, moon: 'blood' },
  sectaire: { glyph: 'cult', decor: 'ruins', particle: 'sparks', hue: -50, moon: 'blood' },
  comedien: { glyph: 'theater', decor: 'camp', particle: 'petals', hue: -90, moon: 'crescent' },
  gitane: { glyph: 'crystal', decor: 'camp', particle: 'sparks', hue: -120, moon: 'crescent' },
};

const CUSTOM_SPEC: ArtSpec = { glyph: 'custom', decor: 'ruins', particle: 'stars', hue: 0, moon: 'half' };

export const ART_ROLE_IDS = Object.keys(SPECS);

/* --------------------------------------------------------------- */
/* Outils                                                           */
/* --------------------------------------------------------------- */

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => (Math.round(n * 10) / 10).toString();

/** Couleur HSL → hexadécimal (react-native-svg et les navigateurs l'acceptent partout). */
function hsl(h: number, s: number, l: number): string {
  const hh = (((h % 360) + 360) % 360) / 360;
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const k = (n: number) => (n + hh * 12) % 12;
  const c = (n: number) => l / 100 - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const x = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${x(c(0))}${x(c(8))}${x(c(4))}`;
}

interface Palette {
  skyTop: string;
  skyBottom: string;
  hillFar: string;
  hillNear: string;
  ground: string;
  glow: string;
  emblem: string;
  ring: string;
  window: string;
  particle: string;
  moon: string;
}

function palette(team: ArtTeam, hue: number, moon: ArtSpec['moon']): Palette {
  const base = team === 'wolves' ? 352 : team === 'solo' ? 272 : 212;
  const h = base + hue * (team === 'village' ? 0.33 : 0.25);
  return {
    skyTop: hsl(h, 60, 8),
    skyBottom: hsl(team === 'village' ? h - 30 : h + 18, 52, team === 'wolves' ? 25 : 28),
    hillFar: hsl(h + 8, 35, 15),
    hillNear: hsl(h + 4, 38, 10),
    ground: hsl(h, 40, 6),
    glow: team === 'wolves' ? '#ff7a6b' : team === 'solo' ? '#d6b4ff' : '#ffd98a',
    emblem: team === 'wolves' ? '#ffd2c8' : team === 'solo' ? '#f0e2ff' : '#fff1cf',
    ring: team === 'wolves' ? '#e0574a' : team === 'solo' ? '#a879f0' : '#d9b25f',
    window: '#ffcf6a',
    particle: team === 'wolves' ? '#ff9a5c' : team === 'solo' ? '#e6ccff' : '#fff0c2',
    moon: moon === 'blood' ? '#e65a4a' : '#f6efd9',
  };
}

/* --------------------------------------------------------------- */
/* Couches                                                          */
/* --------------------------------------------------------------- */

const W = 300;
const H = 400;

function stars(r: () => number, color: string, count: number): string {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = r() * W;
    const y = r() * 210;
    const s = 0.5 + r() * 1.4;
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="${color}" opacity="${f(0.35 + r() * 0.6)}"/>`;
  }
  return out;
}

function moonLayer(kind: ArtSpec['moon'], p: Palette, r: () => number): string {
  if (kind === 'none') return '';
  const cx = 70 + r() * 160;
  const cy = 62 + r() * 30;
  const rad = kind === 'full' || kind === 'blood' ? 30 : 26;
  let out = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${rad * 2.4}" fill="url(#halo)"/>`;
  // Partie éclairée seule (aucun disque sombre superposé au ciel dégradé).
  if (kind === 'crescent') {
    out += `<path d="M${f(cx)} ${f(cy - rad)} A${rad} ${rad} 0 1 0 ${f(cx)} ${f(cy + rad)} A${f(rad * 0.62)} ${rad} 0 1 1 ${f(cx)} ${f(cy - rad)} Z" fill="${p.moon}"/>`;
  } else if (kind === 'half') {
    out += `<path d="M${f(cx)} ${f(cy - rad)} A${rad} ${rad} 0 0 0 ${f(cx)} ${f(cy + rad)} Z" fill="${p.moon}"/>`;
    out += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${rad}" fill="none" stroke="${p.moon}" stroke-opacity="0.18"/>`;
  } else {
    out += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${rad}" fill="${p.moon}"/>`;
    for (let i = 0; i < 4; i++) out += `<circle cx="${f(cx - rad * 0.5 + r() * rad)}" cy="${f(cy - rad * 0.4 + r() * rad * 0.8)}" r="${f(2 + r() * 4)}" fill="#000" opacity="0.07"/>`;
  }
  return out;
}

/** Grande silhouette de l'emblème dans le ciel (profondeur, effet « constellation »). */
function skyGhost(glyph: string, p: Palette): string {
  const scale = 11;
  const t = `translate(${f(150 - 12 * scale)} ${f(170 - 12 * scale)}) scale(${scale})`;
  return `<path d="${glyph}" transform="${t}" fill="none" stroke="${p.glow}" stroke-opacity="0.07" stroke-width="0.6" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** Rayons de lumière derrière le médaillon. */
function rays(p: Palette, r: () => number): string {
  let out = '';
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12 + r() * 0.2;
    const x1 = 150 + Math.cos(a) * 80;
    const y1 = 196 + Math.sin(a) * 80;
    const x2 = 150 + Math.cos(a) * (150 + r() * 40);
    const y2 = 196 + Math.sin(a) * (150 + r() * 40);
    out += `<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}" stroke="${p.glow}" stroke-opacity="${f(0.05 + r() * 0.07)}" stroke-width="${f(2 + r() * 5)}" stroke-linecap="round"/>`;
  }
  return out;
}

function ridge(r: () => number, baseY: number, amp: number, color: string, step = 30): string {
  let d = `M0 ${H} L0 ${f(baseY)}`;
  for (let x = 0; x <= W + step; x += step) d += ` Q${f(x - step / 2)} ${f(baseY - amp * r())} ${f(x)} ${f(baseY - amp * 0.4 * r())}`;
  d += ` L${W} ${H} Z`;
  return `<path d="${d}" fill="${color}"/>`;
}

function tree(x: number, y: number, h: number, color: string): string {
  const w = h * 0.42;
  return `<path d="M${f(x)} ${f(y - h)} L${f(x + w)} ${f(y - h * 0.35)} L${f(x + w * 0.55)} ${f(y - h * 0.38)} L${f(x + w * 1.15)} ${f(y)} L${f(x - w * 1.15)} ${f(y)} L${f(x - w * 0.55)} ${f(y - h * 0.38)} L${f(x - w)} ${f(y - h * 0.35)} Z" fill="${color}"/>`;
}

function house(x: number, y: number, w: number, h: number, color: string, win: string, lit: boolean): string {
  const roof = h * 0.7;
  let out = `<path d="M${f(x)} ${f(y)} V${f(y - h)} L${f(x + w / 2)} ${f(y - h - roof)} L${f(x + w)} ${f(y - h)} V${f(y)} Z" fill="${color}"/>`;
  if (lit) out += `<rect x="${f(x + w * 0.35)}" y="${f(y - h * 0.7)}" width="${f(w * 0.3)}" height="${f(h * 0.32)}" rx="1" fill="${win}" opacity="0.9"/>`;
  return out;
}

function decorLayer(decor: Decor, p: Palette, r: () => number): string {
  const y = 330;
  let out = '';
  switch (decor) {
    case 'forest':
      for (let i = 0; i < 14; i++) out += tree(-10 + i * 24 + r() * 10, y + 8 + r() * 10, 50 + r() * 60, p.hillNear);
      break;
    case 'village':
      for (let i = 0; i < 6; i++) out += house(8 + i * 50 + r() * 8, y + 10, 26 + r() * 12, 20 + r() * 14, p.hillNear, p.window, r() < 0.7);
      break;
    case 'church': {
      out += house(30, y + 10, 34, 22, p.hillNear, p.window, true);
      out += `<path d="M120 ${y + 10} V${y - 40} L140 ${y - 92} L160 ${y - 40} V${y + 10} Z" fill="${p.hillNear}"/>`;
      out += `<path d="M140 ${y - 112} V${y - 92} M133 ${y - 104} H147" stroke="${p.hillNear}" stroke-width="3"/>`;
      out += `<circle cx="140" cy="${y - 30}" r="6" fill="${p.window}" opacity="0.85"/>`;
      out += house(210, y + 10, 40, 24, p.hillNear, p.window, r() < 0.6);
      break;
    }
    case 'fields':
      for (let i = 0; i < 9; i++) out += `<path d="M${f(i * 36 - 10)} ${y + 20} Q${f(i * 36 + 8)} ${f(y - 6 - r() * 10)} ${f(i * 36 + 26)} ${y + 20}" fill="${p.hillNear}"/>`;
      out += house(220, y + 6, 30, 18, p.hillNear, p.window, true);
      break;
    case 'ruins':
      for (let i = 0; i < 5; i++) {
        const x = 20 + i * 58 + r() * 10;
        const h = 30 + r() * 60;
        out += `<path d="M${f(x)} ${y + 10} V${f(y - h)} L${f(x + 8)} ${f(y - h - 8)} L${f(x + 18)} ${f(y - h + 4)} V${y + 10} Z" fill="${p.hillNear}"/>`;
      }
      out += `<path d="M0 ${y + 4} H${W}" stroke="${p.hillNear}" stroke-width="10"/>`;
      break;
    case 'camp': {
      out += `<path d="M30 ${y + 10} L80 ${y - 50} L130 ${y + 10} Z" fill="${p.hillNear}"/><path d="M80 ${y - 50} L80 ${y + 10}" stroke="${p.hillFar}" stroke-width="2"/>`;
      out += `<path d="M180 ${y + 10} L225 ${y - 40} L270 ${y + 10} Z" fill="${p.hillNear}"/>`;
      out += `<circle cx="150" cy="${y + 2}" r="16" fill="url(#fire)"/><path d="M144 ${y + 6} Q150 ${y - 14} 156 ${y + 6} Z" fill="${p.window}"/>`;
      break;
    }
  }
  return out;
}

function particles(kind: Particle, p: Palette, r: () => number): string {
  let out = '';
  const n = 16;
  for (let i = 0; i < n; i++) {
    const x = 12 + r() * (W - 24);
    const y = 20 + r() * 300;
    const s = 3 + r() * 5;
    const o = f(0.35 + r() * 0.5);
    const c = p.particle;
    switch (kind) {
      case 'hearts':
        out += `<path d="M${f(x)} ${f(y + s)} C${f(x - s * 1.6)} ${f(y - s * 0.2)} ${f(x - s * 0.6)} ${f(y - s * 1.4)} ${f(x)} ${f(y - s * 0.4)} C${f(x + s * 0.6)} ${f(y - s * 1.4)} ${f(x + s * 1.6)} ${f(y - s * 0.2)} ${f(x)} ${f(y + s)} Z" fill="#ff9ab5" opacity="${o}"/>`;
        break;
      case 'embers':
        out += `<circle cx="${f(x)}" cy="${f(y + 60)}" r="${f(s * 0.35)}" fill="${c}" opacity="${o}"/>`;
        break;
      case 'bubbles':
        out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 0.8)}" fill="none" stroke="#9cf0c4" stroke-width="1.2" opacity="${o}"/>`;
        break;
      case 'notes':
        out += `<path d="M${f(x)} ${f(y)} v${f(-s * 2)} l${f(s * 1.2)} ${f(-s * 0.5)}" stroke="${c}" stroke-width="1.5" fill="none" opacity="${o}"/><ellipse cx="${f(x - s * 0.5)}" cy="${f(y)}" rx="${f(s * 0.6)}" ry="${f(s * 0.45)}" fill="${c}" opacity="${o}"/>`;
        break;
      case 'feathers':
        out += `<path d="M${f(x)} ${f(y)} q${f(s)} ${f(-s * 1.6)} ${f(s * 2.4)} ${f(-s * 2)} q${f(-s * 0.2)} ${f(s * 1.6)} ${f(-s * 2.4)} ${f(s * 2)} Z" fill="${c}" opacity="${o}"/>`;
        break;
      case 'leaves':
        out += `<path d="M${f(x)} ${f(y)} q${f(s)} ${f(-s)} ${f(s * 2)} 0 q${f(-s)} ${f(s)} ${f(-s * 2)} 0 Z" fill="#9fd47a" opacity="${o}"/>`;
        break;
      case 'sparks':
        out += `<path d="M${f(x)} ${f(y - s)} L${f(x + s * 0.25)} ${f(y - s * 0.25)} L${f(x + s)} ${f(y)} L${f(x + s * 0.25)} ${f(y + s * 0.25)} L${f(x)} ${f(y + s)} L${f(x - s * 0.25)} ${f(y + s * 0.25)} L${f(x - s)} ${f(y)} L${f(x - s * 0.25)} ${f(y - s * 0.25)} Z" fill="${c}" opacity="${o}"/>`;
        break;
      case 'snow':
        out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 0.3)}" fill="#ffffff" opacity="${o}"/>`;
        break;
      case 'petals':
        out += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s * 0.7)}" ry="${f(s * 0.35)}" fill="#f7b7d0" opacity="${o}" transform="rotate(${f(r() * 180)} ${f(x)} ${f(y)})"/>`;
        break;
      case 'stars':
        break;
    }
  }
  return out;
}

function emblem(glyph: string, p: Palette): string {
  const cx = W / 2;
  const cy = 196;
  const R = 74;
  let out = `<circle cx="${cx}" cy="${cy}" r="${R + 30}" fill="url(#emblemGlow)"/>`;
  out += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${p.ground}" fill-opacity="0.82" stroke="${p.ring}" stroke-width="3"/>`;
  out += `<circle cx="${cx}" cy="${cy}" r="${R - 9}" fill="none" stroke="${p.ring}" stroke-width="1" stroke-dasharray="2 5" opacity="0.8"/>`;
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    out += `<circle cx="${f(cx + Math.cos(a) * R)}" cy="${f(cy + Math.sin(a) * R)}" r="3" fill="${p.ring}"/>`;
  }
  const scale = 4.2;
  const t = `translate(${f(cx - 12 * scale)} ${f(cy - 12 * scale)}) scale(${scale})`;
  // Lueur simulée par plusieurs traits (sans filtre, compatible partout).
  out += `<path d="${glyph}" transform="${t}" fill="none" stroke="${p.glow}" stroke-opacity="0.18" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  out += `<path d="${glyph}" transform="${t}" fill="none" stroke="${p.glow}" stroke-opacity="0.35" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  out += `<path d="${glyph}" transform="${t}" fill="${p.emblem}" fill-opacity="0.12" stroke="${p.emblem}" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/>`;
  return out;
}

function frame(p: Palette, title: string | null): string {
  let out = `<rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="18" fill="none" stroke="${p.ring}" stroke-width="2.5"/>`;
  out += `<rect x="13" y="13" width="${W - 26}" height="${H - 26}" rx="13" fill="none" stroke="${p.ring}" stroke-width="0.8" opacity="0.6"/>`;
  for (const [x, y] of [
    [13, 13],
    [W - 13, 13],
    [13, H - 13],
    [W - 13, H - 13],
  ]) {
    out += `<path d="M${x - 6} ${y} L${x} ${y - 6} L${x + 6} ${y} L${x} ${y + 6} Z" fill="${p.ring}"/>`;
  }
  if (title) {
    out += `<path d="M40 ${H - 66} H${W - 40} L${W - 28} ${H - 48} L${W - 40} ${H - 30} H40 L28 ${H - 48} Z" fill="${p.ground}" stroke="${p.ring}" stroke-width="1.5"/>`;
    out += `<text x="${W / 2}" y="${H - 42}" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-weight="700" font-size="${title.length > 18 ? 14 : 18}" fill="${p.emblem}" letter-spacing="1">${escapeXml(title)}</text>`;
  }
  return out;
}

function escapeXml(s: string): string {
  // Caractères interdits en XML (contrôle) retirés : ils rendraient l'image illisible.
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface RoleArtOptions {
  team: ArtTeam;
  /** Titre dessiné sur la carte (export) ; l'app affiche le nom à part. */
  title?: string | null;
}

/** SVG complet (300 × 400) de l'illustration d'un rôle. */
export function roleArtSvg(roleId: string, opts: RoleArtOptions): string {
  const spec = SPECS[roleId] ?? CUSTOM_SPEC;
  const p = palette(opts.team, spec.hue, spec.moon);
  const r = rng(hash(roleId));
  const glyph = ROLE_GLYPHS[spec.glyph];
  const defs =
    `<defs>` +
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.skyTop}"/><stop offset="1" stop-color="${p.skyBottom}"/></linearGradient>` +
    `<radialGradient id="halo"><stop offset="0" stop-color="${p.moon}" stop-opacity="0.35"/><stop offset="1" stop-color="${p.moon}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="emblemGlow"><stop offset="0.55" stop-color="${p.glow}" stop-opacity="0.28"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="fire"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.9"/><stop offset="1" stop-color="#ff6a3d" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.07"/></linearGradient>` +
    `<clipPath id="card"><rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="18"/></clipPath>` +
    `</defs>`;
  const scene =
    `<g clip-path="url(#card)">` +
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>` +
    stars(r, '#ffffff', 46) +
    moonLayer(spec.moon, p, r) +
    skyGhost(glyph, p) +
    rays(p, r) +
    ridge(r, 270, 50, p.hillFar, 40) +
    `<rect y="240" width="${W}" height="80" fill="url(#mist)"/>` +
    ridge(r, 315, 30, p.hillNear, 30) +
    decorLayer(spec.decor, p, r) +
    `<rect y="336" width="${W}" height="${H - 336}" fill="${p.ground}"/>` +
    particles(spec.particle, p, r) +
    emblem(glyph, p) +
    `</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}${scene}${frame(p, opts.title ?? null)}</svg>`;
}
