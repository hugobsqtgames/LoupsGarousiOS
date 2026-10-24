import { GameDriver, makeSetup } from '@/engine/testing';
import { openNodeDriver } from '@/storage/node-driver';
import type { Repository } from '@/storage/repository';
import { useAppStore } from './app-store';
import { useGameStore } from './game-store';
import { configureDriverFactory, getRepository } from './services';

jest.spyOn(process, 'emitWarning').mockImplementation(() => undefined);

/** Régressions de l'audit QA sur le magasin de partie (chaque test échouait avant correction). */

function setupOf(id: string, names?: string[]) {
  return { ...makeSetup(['loup-garou', 'voyante', 'villageois', 'villageois', 'villageois'], names ? { names } : {}), id, name: `Partie ${id}` };
}

async function seed(repo: Repository, id: string) {
  const g = new GameDriver(setupOf(id));
  await repo.saveGame(g.record, g.state);
}

beforeEach(async () => {
  configureDriverFactory(async () => openNodeDriver());
  await useGameStore.getState().close();
  await useAppStore.getState().init();
});

describe('magasin de partie', () => {
  it('deux ouvertures rapprochées : seule la dernière demandée l’emporte', async () => {
    const repo = await getRepository();
    await seed(repo, 'A');
    await seed(repo, 'B');
    // Le chargement de A est ralenti : il se termine après celui de B.
    const original = repo.loadGame.bind(repo);
    const spy = jest.spyOn(repo, 'loadGame').mockImplementation(async (id: string) => {
      const res = await original(id);
      if (id === 'A') await new Promise((r) => setTimeout(r, 30));
      return res;
    });
    const pA = useGameStore.getState().open('A');
    const pB = useGameStore.getState().open('B');
    await Promise.all([pA, pB]);
    spy.mockRestore();
    const s = useGameStore.getState();
    expect(s.gameId).toBe('B');
    expect(s.state?.setup.id).toBe('B');
    expect(s.record?.setup.id).toBe('B');
    expect(s.loading).toBe(false);
  });

  it('une partie supprimée n’est plus servie depuis la mémoire ni réécrite', async () => {
    const repo = await getRepository();
    await seed(repo, 'D');
    expect(await useGameStore.getState().open('D')).toBe(true);
    useGameStore.getState().dispatch({ type: 'mj/note', text: 'note' });
    await useAppStore.getState().deleteGame('D');
    expect(useGameStore.getState().gameId).toBeNull();
    expect(await useGameStore.getState().open('D')).toBe(false);
    expect(useGameStore.getState().loadError).toMatch(/introuvable/);
    expect(await repo.listGames()).toEqual([]);
  });

  it('l’effacement complet ferme la partie ouverte (pas de résurrection)', async () => {
    const repo = await getRepository();
    await seed(repo, 'R');
    await useGameStore.getState().open('R');
    await useAppStore.getState().resetAll();
    expect(useGameStore.getState().gameId).toBeNull();
    expect(useGameStore.getState().dispatch({ type: 'mj/note', text: 'x' }).ok).toBe(false);
    await useGameStore.getState().flush();
    expect(await repo.listGames()).toEqual([]);
  });

  it('une configuration non relisible est refusée à la création (nom trop long)', async () => {
    const names = ['A'.repeat(70), 'Bo', 'Cy', 'Di', 'Ed'];
    const r = await useGameStore.getState().create(setupOf('L', names));
    expect(r.ok).toBe(false);
    expect(await (await getRepository()).listGames()).toEqual([]);
  });

  it('les variantes sont normalisées à la création : la partie jouée est celle rejouée', async () => {
    const setup = { ...setupOf('V'), variants: { ...setupOf('V').variants, mayorEnabled: 'oui' as unknown as boolean } };
    const r = await useGameStore.getState().create(setup);
    expect(r.ok).toBe(true);
    const live = useGameStore.getState().state!;
    expect(typeof live.setup.variants.mayorEnabled).toBe('boolean');
    await useGameStore.getState().close();
    await useGameStore.getState().open('V');
    expect(JSON.stringify(useGameStore.getState().state)).toBe(JSON.stringify(live));
  });

  it('une écriture échouée est retentée à la fermeture', async () => {
    const repo = await getRepository();
    await seed(repo, 'S');
    await useGameStore.getState().open('S');
    const original = repo.saveGame.bind(repo);
    let calls = 0;
    const spy = jest.spyOn(repo, 'saveGame').mockImplementation((...args) => {
      calls += 1;
      if (calls === 1) return Promise.reject(new Error('disque plein'));
      return original(...args);
    });
    useGameStore.getState().dispatch({ type: 'mj/note', text: 'à garder' });
    await useGameStore.getState().flush();
    expect(useGameStore.getState().save.status).toBe('error');
    await useGameStore.getState().close();
    spy.mockRestore();
    const loaded = await repo.loadGame('S');
    expect(loaded.record.actions.map((a) => a.action.type)).toEqual(['mj/note']);
  });
});
