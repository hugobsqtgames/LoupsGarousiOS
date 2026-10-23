import { GameDriver, makeSetup } from '@/engine/testing';
import { replay } from '@/engine';
import type { SqlDriver } from '../driver';
import { getSchemaVersion, migrate, MIGRATIONS, SCHEMA_VERSION } from '../migrations';
import { openNodeDriver } from '../node-driver';
import { checksumOf, Repository } from '../repository';
import { DataError } from '../validation';

jest.spyOn(process, 'emitWarning').mockImplementation(() => undefined);

function sampleGame(id = 'g1') {
  const setup = { ...makeSetup(['loup-garou', 'loup-garou', 'voyante', 'sorciere', 'villageois', 'villageois', 'villageois', 'villageois']), id, name: `Partie ${id}` };
  const g = new GameDriver(setup);
  g.finishNight({ wolves: { target: 'p5' } }).act({ type: 'dawn/confirm' });
  g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' }).act({ type: 'ballot/vote', target: 'p1' });
  return g;
}

async function openRepo(): Promise<{ repo: Repository; db: SqlDriver }> {
  const db = openNodeDriver();
  const repo = await Repository.open(db);
  return { repo, db };
}

describe('migrations', () => {
  it('crée le schéma à la dernière version et est idempotent', async () => {
    const db = openNodeDriver();
    expect(await migrate(db)).toEqual({ from: 0, to: SCHEMA_VERSION });
    expect(await migrate(db)).toEqual({ from: SCHEMA_VERSION, to: SCHEMA_VERSION });
    const tables = await db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    expect(tables.map((t) => t.name)).toEqual(['compositions', 'custom_roles', 'games', 'games_backup', 'settings']);
  });

  it('migre depuis un ancien schéma en conservant les données', async () => {
    const db = openNodeDriver();
    await migrate(db, MIGRATIONS);
    await db.run("INSERT INTO settings (key, value_json) VALUES ('k', '1')");
    const v2 = [...MIGRATIONS, { version: 2, description: 'test', sql: 'ALTER TABLE settings ADD COLUMN extra TEXT;' }];
    expect(await migrate(db, v2)).toEqual({ from: 1, to: 2 });
    expect(await db.first('SELECT key, extra FROM settings')).toEqual({ key: 'k', extra: null });
  });

  it('une migration en échec est entièrement annulée', async () => {
    const db = openNodeDriver();
    await migrate(db);
    const broken = [...MIGRATIONS, { version: 2, description: 'cassée', sql: 'CREATE TABLE t (x INTEGER); INSERT INTO inexistante VALUES (1);' }];
    await expect(migrate(db, broken)).rejects.toThrow();
    expect(await getSchemaVersion(db)).toBe(1);
    expect(await db.first("SELECT name FROM sqlite_master WHERE name = 't'")).toBeNull();
  });

  it('refuse une base créée par une version plus récente', async () => {
    const db = openNodeDriver();
    await db.exec('PRAGMA user_version = 99');
    await expect(migrate(db)).rejects.toThrow(/plus récente/);
  });
});

describe('parties', () => {
  it('sauvegarde puis recharge une partie à l’identique', async () => {
    const { repo } = await openRepo();
    const g = sampleGame();
    await repo.saveGame(g.record, g.state);
    const loaded = await repo.loadGame('g1');
    expect(loaded.source).toBe('primary');
    expect(loaded.failure).toBeNull();
    expect(JSON.stringify(replay(loaded.record).state)).toBe(JSON.stringify(g.state));
    const list = await repo.listGames();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'g1', status: 'active', phaseLabel: 'Jour 1', playerCount: 8, aliveCount: 7 });
  });

  it('utilise la copie de secours si la version principale est altérée', async () => {
    const { repo, db } = await openRepo();
    const g = sampleGame();
    await repo.saveGame(g.record, g.state);
    g.act({ type: 'ballot/vote', target: 'p1' });
    await repo.saveGame(g.record, g.state);
    await db.run("UPDATE games SET actions_json = '[{\"broken' WHERE id = 'g1'");
    const loaded = await repo.loadGame('g1');
    expect(loaded.source).toBe('backup');
    expect(loaded.record.actions.length).toBe(g.record.actions.length - 1);
    expect(loaded.warnings.join(' ')).toMatch(/secours/);
  });

  it('signale une erreur claire si toutes les copies sont illisibles', async () => {
    const { repo, db } = await openRepo();
    const g = sampleGame();
    await repo.saveGame(g.record, g.state);
    await db.run("UPDATE games SET checksum = 'x' WHERE id = 'g1'");
    await expect(repo.loadGame('g1')).rejects.toBeInstanceOf(DataError);
    await expect(repo.loadGame('absente')).rejects.toThrow(/introuvable/);
  });

  it('détecte un historique incohérent et indique l’action fautive', async () => {
    const { repo, db } = await openRepo();
    const g = sampleGame();
    await repo.saveGame(g.record, g.state);
    const actions = [...g.record.actions, { action: { type: 'ballot/vote', target: 'p5' }, at: '' }];
    const setupJson = JSON.stringify(g.record.setup);
    const actionsJson = JSON.stringify(actions);
    await db.run('UPDATE games SET actions_json = ?, action_count = ?, checksum = ? WHERE id = ?', [actionsJson, actions.length, checksumOf(setupJson, actionsJson), 'g1']);
    const loaded = await repo.loadGame('g1');
    expect(loaded.failure?.index).toBe(actions.length - 1);
    expect(loaded.failure?.code).toBe('dead-target');
  });

  it('rejette une action de type inconnu', async () => {
    const { repo, db } = await openRepo();
    const g = sampleGame();
    await repo.saveGame(g.record, g.state);
    const actionsJson = JSON.stringify([{ action: { type: 'hack/eval', code: 'x' }, at: '' }]);
    const setupJson = JSON.stringify(g.record.setup);
    await db.run('UPDATE games SET actions_json = ?, action_count = 1, checksum = ? WHERE id = ?', [actionsJson, checksumOf(setupJson, actionsJson), 'g1']);
    await db.run('DELETE FROM games_backup');
    await expect(repo.loadGame('g1')).rejects.toThrow(/invalide/);
  });

  it('un échec d’écriture rejette la promesse et préserve la version précédente', async () => {
    const db = openNodeDriver();
    const repo = await Repository.open(db);
    const g = sampleGame();
    await repo.saveGame(g.record, g.state);
    const before = g.record.actions.length;
    const originalRun = db.run;
    let calls = 0;
    db.run = async (sql, params) => {
      calls += 1;
      if (sql.startsWith('INSERT OR REPLACE INTO games (')) throw new Error('disque plein');
      return originalRun(sql, params);
    };
    g.act({ type: 'ballot/vote', target: 'p1' });
    await expect(repo.saveGame(g.record, g.state)).rejects.toThrow('disque plein');
    db.run = originalRun;
    expect(calls).toBeGreaterThan(0);
    const loaded = await repo.loadGame('g1');
    expect(loaded.record.actions.length).toBe(before);
    expect(loaded.source).toBe('primary');
  });

  it('sérialise les sauvegardes concurrentes : la dernière gagne', async () => {
    const { repo } = await openRepo();
    const g = sampleGame();
    const snapshots: number[] = [];
    const saves: Promise<void>[] = [];
    for (let i = 0; i < 20; i++) {
      g.act({ type: 'ballot/vote', target: 'p1' });
      snapshots.push(g.record.actions.length);
      saves.push(repo.saveGame(g.record, g.state));
      if (g.record.actions.length > 12) break;
    }
    await Promise.all(saves);
    const loaded = await repo.loadGame('g1');
    expect(loaded.record.actions.length).toBe(snapshots[snapshots.length - 1]);
  });

  it('supprime une partie et sa copie de secours', async () => {
    const { repo, db } = await openRepo();
    const g = sampleGame();
    await repo.saveGame(g.record, g.state);
    await repo.saveGame(g.record, g.state);
    await repo.deleteGame('g1');
    expect(await repo.listGames()).toEqual([]);
    expect(await db.first('SELECT id FROM games_backup')).toBeNull();
  });
});

describe('paramètres, compositions, rôles personnalisés', () => {
  it('stocke et relit les paramètres', async () => {
    const { repo } = await openRepo();
    expect(await repo.getSetting('app')).toBeNull();
    await repo.setSetting('app', { themeId: 'foret' });
    expect(await repo.getSetting('app')).toEqual({ themeId: 'foret' });
  });

  it('gère les compositions favorites', async () => {
    const { repo } = await openRepo();
    await repo.saveComposition({ id: 'c1', name: 'Classique 8', createdAt: '2026-01-01', roles: ['voyante'], extraCards: [], variants: {}, playerNames: [] });
    expect((await repo.listCompositions()).map((c) => c.name)).toEqual(['Classique 8']);
    await repo.deleteComposition('c1');
    expect(await repo.listCompositions()).toEqual([]);
  });

  it('valide les rôles personnalisés', async () => {
    const { repo } = await openRepo();
    const role = { id: 'custom:garde', name: 'Garde', team: 'village', description: '', nightAction: 'protect', schedule: 'every_night', uses: null, canTargetSelf: true, onDeath: 'none', wakeOrder: 50 } as const;
    await repo.saveCustomRole(role);
    expect(await repo.listCustomRoles()).toEqual([role]);
    await expect(repo.saveCustomRole({ ...role, nightAction: 'eval' as never })).rejects.toBeInstanceOf(DataError);
  });
});

describe('export / import', () => {
  it('aller-retour complet', async () => {
    const a = await openRepo();
    const g = sampleGame();
    await a.repo.saveGame(g.record, g.state);
    await a.repo.setSetting('app', { themeId: 'sang' });
    const bundle = await a.repo.exportData();
    const b = await openRepo();
    const report = await b.repo.importData(JSON.stringify(bundle), { includeSettings: true });
    expect(report).toMatchObject({ games: 1, renamedGames: 0, settings: true });
    expect((await b.repo.loadGame('g1')).record.actions).toEqual(g.record.actions);
    expect(await b.repo.getSetting('app')).toEqual({ themeId: 'sang' });
  });

  it('renomme les parties déjà présentes au lieu de les écraser', async () => {
    const { repo } = await openRepo();
    const g = sampleGame();
    await repo.saveGame(g.record, g.state);
    const bundle = await repo.exportData();
    const report = await repo.importData(JSON.stringify(bundle));
    expect(report.renamedGames).toBe(1);
    expect(await repo.listGames()).toHaveLength(2);
  });

  it('rejette un fichier mal formé sans rien écrire', async () => {
    const { repo } = await openRepo();
    await expect(repo.importData('{pas du json')).rejects.toBeInstanceOf(DataError);
    await expect(repo.importData(JSON.stringify({ app: 'autre' }))).rejects.toThrow(/provient/);
    const g = sampleGame();
    const good = { setup: g.record.setup, actions: g.record.actions };
    const bad = { setup: { ...g.record.setup, id: 'g2' }, actions: [...g.record.actions, { action: { type: 'ballot/vote', target: 'zz' }, at: '' }] };
    const text = JSON.stringify({ app: 'loups-garous-mj', exportVersion: 1, games: [good, bad], compositions: [], customRoles: [] });
    await expect(repo.importData(text)).rejects.toThrow(/incohérente/);
    expect(await repo.listGames()).toEqual([]);
  });
});

describe('volume', () => {
  it('enregistre et liste 200 parties rapidement', async () => {
    const { repo } = await openRepo();
    const g = sampleGame();
    const t0 = Date.now();
    for (let i = 0; i < 200; i++) {
      await repo.saveGame({ ...g.record, setup: { ...g.record.setup, id: `g${i}` } }, g.state);
    }
    const list = await repo.listGames();
    const ms = Date.now() - t0;
    expect(list).toHaveLength(200);
    expect(ms).toBeLessThan(10000);
    const stats = await repo.storageStats();
    expect(stats.games).toBe(200);
    await repo.resetAll();
    expect(await repo.listGames()).toEqual([]);
  });
});

describe('résumés par joueur', () => {
  it('les résumés anciens (sans détail par joueur) sont recalculés à l’ouverture', async () => {
    const { repo, db } = await openRepo();
    const g = sampleGame('old');
    await repo.saveGame(g.record, g.state);
    const row = await db.first<{ summary_json: string }>('SELECT summary_json FROM games WHERE id = ?', ['old']);
    const legacy = JSON.parse(row!.summary_json);
    delete legacy.players;
    delete legacy.summaryVersion;
    await db.run('UPDATE games SET summary_json = ? WHERE id = ?', [JSON.stringify(legacy), 'old']);
    const reopened = await Repository.open(db);
    const [summary] = await reopened.listGames();
    expect(summary.players).toHaveLength(8);
    expect(summary.players!.find((p) => p.name === 'Joueur 5')).toMatchObject({ alive: false, firstNightDeath: true });
  });
});
