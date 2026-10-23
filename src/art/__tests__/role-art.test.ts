import * as fs from 'node:fs';
import * as path from 'node:path';
import { BUILTIN_ROLE_LIST } from '@/engine';
import { ART_ROLE_IDS, roleArtSvg } from '../role-art';

describe('Illustrations des rôles', () => {
  it('chaque rôle intégré possède une illustration propre', () => {
    for (const r of BUILTIN_ROLE_LIST) expect(ART_ROLE_IDS).toContain(r.id);
  });

  it('SVG bien formé, déterministe et distinct d’un rôle à l’autre', () => {
    const seen = new Set<string>();
    for (const r of BUILTIN_ROLE_LIST) {
      const svg = roleArtSvg(r.id, { team: r.team, title: r.name });
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg).not.toMatch(/NaN|undefined/);
      expect((svg.match(/<g/g) ?? []).length).toBe((svg.match(/<\/g>/g) ?? []).length);
      expect(roleArtSvg(r.id, { team: r.team, title: r.name })).toBe(svg);
      seen.add(svg);
    }
    expect(seen.size).toBe(BUILTIN_ROLE_LIST.length);
  });

  it('échappe le titre (noms de rôles personnalisés)', () => {
    expect(roleArtSvg('custom:x', { team: 'solo', title: 'A&B <c>' })).toContain('A&amp;B &lt;c&gt;');
  });

  // Export des fichiers SVG pour scripts/render-role-art.mjs (ROLE_ART_OUT=dossier).
  const out = process.env.ROLE_ART_OUT;
  (out ? it : it.skip)('exporte les illustrations', () => {
    fs.mkdirSync(out!, { recursive: true });
    for (const r of BUILTIN_ROLE_LIST) fs.writeFileSync(path.join(out!, `${r.id}.svg`), roleArtSvg(r.id, { team: r.team, title: r.name }));
  });
});
