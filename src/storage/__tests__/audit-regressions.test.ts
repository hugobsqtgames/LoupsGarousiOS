import { GameDriver, makeSetup } from '@/engine/testing';
import { openNodeDriver } from '../node-driver';
import { EXPORT_APP_ID, Repository } from '../repository';

jest.spyOn(process, 'emitWarning').mockImplementation(() => undefined);

/** Régressions issues de l'audit QA (chaque test échouait avant sa correction). */

function game(id: string) {
  const setup = { ...makeSetup(['loup-garou', 'voyante', 'villageois', 'villageois', 'villageois']), id, name: `Partie ${id}` };
  const g = new GameDriver(setup);
  g.finishNight({ wolves: { target: 'p3' } });
  return g;
}

describe('export', () => {
  it('une composition ou un rôle personnalisé corrompu n’empêche pas la sauvegarde du reste', async () => {
    const db = openNodeDriver();
    const repo = await Repository.open(db);
    const g = game('g1');
    await repo.saveGame(g.record, g.state);
    await db.run("INSERT INTO compositions (id, name, data_json, created_at) VALUES ('c1', 'x', '{tronqué', '2026-01-01')");
    await db.run("INSERT INTO custom_roles (id, data_json, created_at) VALUES ('r1', '{\"id\":\"r1\"}', '2026-01-01')");
    await db.run("INSERT INTO custom_roles (id, data_json, created_at) VALUES ('r2', 'pas du json', '2026-01-01')");
    const bundle = await repo.exportData();
    expect(bundle.games).toHaveLength(1);
    expect(bundle.compositions).toEqual([]);
    expect(bundle.customRoles).toEqual([]);
  });
});

describe('import', () => {
  it('deux parties avec le même identifiant dans un fichier sont toutes deux importées', async () => {
    const repo = await Repository.open(openNodeDriver());
    const a = game('same');
    const text = JSON.stringify({ app: EXPORT_APP_ID, exportVersion: 1, games: [a.record, a.record] });
    const report = await repo.importData(text);
    expect(report.games).toBe(2);
    expect(report.renamedGames).toBe(1);
    const list = await repo.listGames();
    expect(list).toHaveLength(2);
    expect(new Set(list.map((g) => g.id)).size).toBe(2);
  });

  it('une composition dont les rôles ne sont pas des textes est refusée avant toute écriture', async () => {
    const repo = await Repository.open(openNodeDriver());
    const text = JSON.stringify({ app: EXPORT_APP_ID, exportVersion: 1, compositions: [{ id: 'c', name: 'n', roles: [42, null], createdAt: 'x' }] });
    await expect(repo.importData(text)).rejects.toThrow(/Composition 1 invalide/);
    expect(await repo.listCompositions()).toEqual([]);
  });

  it('une partie importée garde sa version de format', async () => {
    const db = openNodeDriver();
    const repo = await Repository.open(db);
    const a = game('fv');
    await repo.importData(JSON.stringify({ app: EXPORT_APP_ID, exportVersion: 1, games: [a.record] }));
    const row = await db.first<{ format_version: number }>('SELECT format_version FROM games');
    expect(row?.format_version).toBe(a.record.setup.formatVersion);
  });
});
