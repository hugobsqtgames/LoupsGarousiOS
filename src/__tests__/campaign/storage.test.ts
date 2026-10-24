import { createRng } from '@/engine';
import { openNodeDriver } from '@/storage/node-driver';
import { Repository, type ExportBundle } from '@/storage/repository';
import { DataError } from '@/storage/validation';
import { playedGame, seeds } from './helpers';

jest.spyOn(process, 'emitWarning').mockImplementation(() => undefined);

/**
 * Campagne QA — stockage SQLite réel (node:sqlite, même moteur qu'expo-sqlite).
 */

async function fresh() {
  const db = openNodeDriver();
  return { db, repo: await Repository.open(db) };
}

async function snapshot(db: ReturnType<typeof openNodeDriver>) {
  const parts: unknown[] = [];
  for (const t of ['games', 'games_backup', 'settings', 'compositions', 'custom_roles']) parts.push(await db.all(`SELECT * FROM ${t} ORDER BY 1`));
  return JSON.stringify(parts);
}

describe.each(seeds(1, 300))('enregistrement, graine %i', (seed) => {
  it('écriture puis lecture identiques ; altération détectée et secours utilisé', async () => {
    const { db, repo } = await fresh();
    const { record, state } = playedGame(seed);
    const half = { setup: record.setup, actions: record.actions.slice(0, Math.floor(record.actions.length / 2)) };
    await repo.saveGame(half, state);
    await repo.saveGame(record, state);
    const loaded = await repo.loadGame(record.setup.id);
    expect(loaded.source).toBe('primary');
    expect(loaded.failure).toBeNull();
    expect(JSON.stringify(loaded.record)).toBe(JSON.stringify(record));

    // Un octet altéré dans la version principale : la copie de secours (version précédente) est servie.
    const rng = createRng(seed);
    const row = await db.first<{ actions_json: string }>('SELECT actions_json FROM games WHERE id = ?', [record.setup.id]);
    const text = row!.actions_json;
    const pos = Math.floor(rng() * text.length);
    const altered = text.slice(0, pos) + (text[pos] === 'a' ? 'b' : 'a') + text.slice(pos + 1);
    await db.run('UPDATE games SET actions_json = ? WHERE id = ?', [altered, record.setup.id]);
    const recovered = await repo.loadGame(record.setup.id);
    expect(recovered.source).toBe('backup');
    expect(JSON.stringify(recovered.record)).toBe(JSON.stringify(half));
    expect(recovered.warnings.length).toBeGreaterThan(0);

    // Les deux versions altérées : erreur explicite, jamais de données inventées.
    await db.run('UPDATE games_backup SET checksum = ? WHERE id = ?', ['x', record.setup.id]);
    await expect(repo.loadGame(record.setup.id)).rejects.toBeInstanceOf(DataError);
    // La liste reste affichable.
    expect((await repo.listGames()).map((g) => g.id)).toEqual([record.setup.id]);
  });
});

describe.each(seeds(1, 60))('écritures concurrentes, graine %i', (seed) => {
  it('la dernière écriture demandée est celle relue', async () => {
    const { repo } = await fresh();
    const { record, state } = playedGame(seed);
    const writes: Promise<void>[] = [];
    for (let k = 1; k <= record.actions.length; k += Math.max(1, Math.floor(record.actions.length / 20))) {
      writes.push(repo.saveGame({ setup: record.setup, actions: record.actions.slice(0, k) }, state));
    }
    writes.push(repo.saveGame(record, state));
    await Promise.all(writes);
    const loaded = await repo.loadGame(record.setup.id);
    expect(loaded.record.actions.length).toBe(record.actions.length);
  });
});

const JUNK: unknown[] = [null, 1, 'x', [], {}, true, -5, '', [{}], { app: 'loups-garous-mj' }];

function mutateBundle(bundle: ExportBundle, seed: number): string {
  const rng = createRng(seed);
  const b = JSON.parse(JSON.stringify(bundle)) as Record<string, unknown>;
  const pick = <T,>(a: T[]) => a[Math.floor(rng() * a.length)];
  const r = rng();
  if (r < 0.08) return JSON.stringify(b).slice(0, Math.floor(rng() * 200)); // fichier tronqué
  if (r < 0.15) b[pick(['app', 'exportVersion', 'games', 'compositions', 'customRoles', 'settings'])] = pick(JUNK);
  else if (r < 0.6) {
    const games = b.games as Record<string, unknown>[];
    const g = pick(games) as Record<string, Record<string, unknown>>;
    const where = rng() < 0.5 ? g.setup : (pick(g.actions as unknown as Record<string, unknown>[]) ?? g.setup);
    const keys = Object.keys(where);
    where[pick(keys)] = pick(JUNK);
  } else if (r < 0.75) {
    (b.compositions as unknown[]).push(pick(JUNK));
  } else if (r < 0.85) {
    (b.customRoles as unknown[]).push({ id: 'custom-x', name: pick(['', 'Nom', 'x'.repeat(500)]), team: pick(['village', 'wolves', 'nope']), nightAction: pick(['none', 'kill', 'eval("x")']) });
  }
  // Sinon : fichier intact.
  return JSON.stringify(b);
}

let base: ExportBundle;

beforeAll(async () => {
  const { repo } = await fresh();
  for (const s of [3, 8, 21]) {
    const { record, state } = playedGame(s);
    await repo.saveGame(record, state);
  }
  await repo.saveComposition({ id: 'c1', name: 'Classique', createdAt: '2026-01-01', roles: ['loup-garou', 'voyante'], extraCards: [], variants: {}, playerNames: [] });
  await repo.setSetting('app-settings', { themeId: 'nuit' });
  base = await repo.exportData('2026-01-01T00:00:00.000Z');
});

describe.each(seeds(1, 400))('import altéré, graine %i', (seed) => {
  it('tout ou rien : refus sans écriture, ou import entièrement relisible', async () => {
    const { db, repo } = await fresh();
    const { record, state } = playedGame(5);
    await repo.saveGame(record, state);
    const before = await snapshot(db);
    const text = mutateBundle(base, seed * 7 + 1);
    let ok = true;
    try {
      await repo.importData(text, { includeSettings: seed % 2 === 0 });
    } catch (e) {
      ok = false;
      expect(e).toBeInstanceOf(DataError);
      expect(await snapshot(db)).toBe(before);
    }
    if (ok) {
      for (const g of await repo.listGames()) {
        const loaded = await repo.loadGame(g.id);
        expect(loaded.failure).toBeNull();
        expect(loaded.source).toBe('primary');
      }
      // Ré-export puis ré-import dans une base vierge : aller-retour stable.
      const again = await repo.exportData('2026-01-02T00:00:00.000Z');
      const other = await fresh();
      const rep = await other.repo.importData(JSON.stringify(again), { includeSettings: true });
      expect(rep.games).toBe(again.games.length);
    }
  });
});
