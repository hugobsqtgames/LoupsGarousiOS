import { generateComposition, learnBalance, type GameOutcomeSample } from '../composition';
import { buildTimeline, dawnAnnouncement, reminders, ANNOUNCEMENT_STYLES } from '../narration';
import { ReplayCursor, replay } from '../replay';
import { GameDriver, makeSetup } from '../testing';
import type { RoleId } from '../types';

const roles: RoleId[] = ['loup-garou', 'loup-garou', 'sorciere', 'cupidon', 'voyante', 'villageois', 'villageois', 'villageois', 'villageois'];

describe('Annonce de l’aube', () => {
  it('nomme les victimes sans trahir la cause nocturne, dans chaque style', () => {
    const g = new GameDriver(makeSetup(roles, { names: ['Ana', 'Bob', 'Cléo', 'Dan', 'Eva', 'Fred', 'Gus', 'Hugo', 'Iris'] }));
    g.finishNight({ cupid: { targets: ['p6', 'p7'] }, wolves: { target: 'p6' }, witch: { heal: null, poison: 'p8' } });
    for (const { value } of ANNOUNCEMENT_STYLES) {
      const a = dawnAnnouncement(g.state, value, { revealRoles: true });
      const text = a.paragraphs.join(' ');
      expect(text).toContain('Fred');
      expect(text).toContain('Hugo');
      expect(text).toContain('Gus'); // mort de chagrin, annoncée
      expect(text).not.toMatch(/Sorcière|empoisonn/i);
      expect(a.deaths.map((d) => d.name)).toEqual(['Fred', 'Hugo', 'Gus']);
    }
  });

  it('masque les cartes si demandé ; texte stable (déterministe)', () => {
    const g = new GameDriver(makeSetup(roles));
    g.finishNight({ cupid: { targets: ['p6', 'p7'] }, wolves: { target: 'p9' } });
    const a = dawnAnnouncement(g.state, 'dramatique', { revealRoles: false });
    expect(a.deaths[0].role).toBeNull();
    expect(a.paragraphs.join(' ')).not.toContain('Simple Villageois');
    expect(dawnAnnouncement(g.state, 'dramatique', { revealRoles: false })).toEqual(a);
  });

  it('nuit sans victime', () => {
    const g = new GameDriver(makeSetup(roles));
    g.finishNight({ cupid: { targets: ['p6', 'p7'] }, wolves: { target: null } });
    expect(dawnAnnouncement(g.state, 'sobre').paragraphs.join(' ')).toContain('Personne n’a été éliminé');
  });

  it('Ensevelissement : la carte des victimes des loups n’est plus révélée', () => {
    const g = new GameDriver(makeSetup(roles, { variants: { newMoonEvents: true, mayorEnabled: false } }));
    g.finishNight({ cupid: { targets: ['p6', 'p7'] }, wolves: { target: 'p9' } }).act({ type: 'dawn/confirm' });
    g.eliminationVote(['p8', 'p8']);
    g.act({ type: 'day/end' }).finishNight({ wolves: { target: 'p5' } }).act({ type: 'dawn/confirm' });
    g.act({ type: 'event/draw', cardId: 'ensevelissement' }).act({ type: 'day/end' });
    g.finishNight({ wolves: { target: 'p3' } });
    const a = dawnAnnouncement(g.state, 'sobre', { revealRoles: true });
    expect(a.deaths[0]).toMatchObject({ playerId: 'p3', role: null });
  });
});

describe('Rappels contextuels', () => {
  it('Sorcière sans potion de vie, Grand Méchant Loup sans pouvoir', () => {
    const g = new GameDriver(makeSetup(['grand-mechant-loup', 'loup-garou', 'sorciere', 'villageois', 'villageois', 'villageois', 'villageois', 'villageois', 'villageois'], { variants: { mayorEnabled: false } }));
    g.finishNight({ wolves: { target: 'p5' }, witch: { heal: 'p5', poison: null }, 'big-bad-wolf': { target: null } }).act({ type: 'dawn/confirm' });
    g.eliminationVote(['p2', 'p2']);
    expect(reminders(g.state).map((r) => r.id)).toContain('bbw-lost');
    g.act({ type: 'day/end' });
    const witchStep = g.steps().find((s) => s.kind === 'witch')!;
    expect(reminders(g.state, witchStep).map((r) => r.id)).toContain('witch-heal');
  });

  it('Salvateur : rappelle la personne protégée la nuit précédente', () => {
    const g = new GameDriver(makeSetup(['loup-garou', 'loup-garou', 'salvateur', 'villageois', 'villageois', 'villageois', 'villageois', 'villageois', 'villageois']));
    g.finishNight({ salvateur: { target: 'p5' }, wolves: { target: 'p6' } }).act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    const step = g.steps().find((s) => s.kind === 'salvateur')!;
    expect(reminders(g.state, step).find((r) => r.id === 'salv-repeat')?.text).toContain('Joueur 5');
  });
});

describe('Chronologie', () => {
  it('regroupe morts, votes et informations secrètes par phase', () => {
    const g = new GameDriver(makeSetup(roles));
    g.finishNight({ cupid: { targets: ['p6', 'p7'] }, wolves: { target: 'p9' } }).act({ type: 'dawn/confirm' });
    g.act({ type: 'ballot/open', kind: 'mayor', mode: 'tally' }).act({ type: 'ballot/vote', target: 'p5' }).act({ type: 'ballot/close' }).act({ type: 'ballot/confirm' });
    g.eliminationVote(['p1', 'p1']);
    const t = buildTimeline(g.state);
    expect(t.map((p) => p.label)).toEqual(['Nuit 1', 'Jour 1']);
    expect(t[0].items.some((i) => i.kind === 'death' && i.playerIds[0] === 'p9')).toBe(true);
    expect(t[0].items.some((i) => i.kind === 'secret' && i.text.startsWith('Amoureux'))).toBe(true);
    expect(t[1].items.filter((i) => i.kind === 'vote')).toHaveLength(2);
    expect(t[1].items.some((i) => i.kind === 'death' && i.playerIds[0] === 'p1')).toBe(true);
  });
});

describe('Rejeu pas à pas', () => {
  it('donne exactement l’état du rejeu complet à chaque étape, dans n’importe quel ordre', () => {
    const g = new GameDriver(makeSetup(roles));
    g.finishNight({ cupid: { targets: ['p6', 'p7'] }, wolves: { target: 'p9' } }).act({ type: 'dawn/confirm' });
    g.eliminationVote(['p1', 'p1']);
    g.act({ type: 'day/end' }).finishNight({ wolves: { target: 'p5' } });
    const cursor = new ReplayCursor(g.record, 4);
    const order = [cursor.length, 0, 7, 3, cursor.length - 1, 12, 5];
    for (const k of order) {
      const expected = replay({ setup: g.record.setup, actions: g.record.actions.slice(0, k) }).state;
      expect(JSON.stringify(cursor.stateAt(k))).toBe(JSON.stringify(expected));
    }
    const starts = cursor.phaseStarts();
    expect(starts[0]).toBe(0);
    expect(starts.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Équilibrage appris de l’historique', () => {
  it('rien sous le seuil de parties ; écart amorti et borné ensuite', () => {
    expect(learnBalance([{ roles: ['sorciere'], villageWon: true }]).sampleSize).toBe(1);
    const samples: GameOutcomeSample[] = [
      ...Array.from({ length: 6 }, () => ({ roles: ['sorciere', 'voyante'] as RoleId[], villageWon: true })),
      ...Array.from({ length: 6 }, () => ({ roles: ['infect', 'voyante'] as RoleId[], villageWon: false })),
    ];
    const learned = learnBalance(samples);
    expect(learned.adjustments.sorciere).toBeGreaterThan(0);
    expect(learned.adjustments.infect).toBeLessThan(0);
    expect(Math.abs(learned.adjustments.sorciere ?? 0)).toBeLessThanOrEqual(3);
    expect(learned.adjustments.voyante).toBeUndefined(); // présente partout : aucun écart
  });

  it('les ajustements modifient l’équilibre calculé et sont expliqués', () => {
    const base = generateComposition({ playerCount: 12, expansions: ['base', 'nouvelle-lune'], complexity: 'equilibre', seed: 4 });
    const tuned = generateComposition({ playerCount: 12, expansions: ['base', 'nouvelle-lune'], complexity: 'equilibre', seed: 4, adjustments: { sorciere: 2 } });
    expect(tuned.explanations.some((e) => e.includes('ajustés'))).toBe(true);
    if (base.roles.includes('sorciere') && tuned.roles.includes('sorciere')) expect(tuned.balance).not.toBe(base.balance);
  });
});
