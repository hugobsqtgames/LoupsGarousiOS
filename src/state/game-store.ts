import { create } from 'zustand';
import { setupErrors, Timeline, type GameAction, type GameRecord, type GameSetup, type GameState, type ReplayFailure } from '@/engine';
import { SaveScheduler, type SaveState } from './save-scheduler';
import { getRepository } from './services';
import { useAppStore } from './app-store';

export type ActionResult = { ok: true } | { ok: false; error: string; code?: string };

interface GameStore {
  gameId: string | null;
  state: GameState | null;
  record: GameRecord | null;
  revision: number;
  loading: boolean;
  loadError: string | null;
  warnings: string[];
  save: SaveState;
  hideSecrets: boolean;
  open(id: string): Promise<boolean>;
  create(setup: GameSetup): Promise<ActionResult>;
  close(): Promise<void>;
  dispatch(action: GameAction): ActionResult;
  undo(): ActionResult;
  rewindTo(count: number): ActionResult;
  replace(index: number, action: GameAction): { ok: true } | { ok: false; failure: ReplayFailure };
  retrySave(): void;
  flush(): Promise<void>;
  setHideSecrets(hide: boolean): void;
  dismissWarnings(): void;
}

let timeline: Timeline | null = null;
let scheduler: SaveScheduler<{ record: GameRecord; state: GameState }> | null = null;

function makeScheduler(set: (p: Partial<GameStore>) => void) {
  return new SaveScheduler<{ record: GameRecord; state: GameState }>(
    async ({ record, state }) => {
      const repo = await getRepository();
      await repo.saveGame(record, state);
    },
    (save) => set({ save }),
  );
}

const INITIAL_SAVE: SaveState = { status: 'idle', error: null, savedVersion: -1, savedAt: null };

export const useGameStore = create<GameStore>((set, get) => {
  const publish = () => {
    if (!timeline) return;
    set({ state: timeline.state, record: timeline.record, revision: get().revision + 1 });
    scheduler?.request(timeline.length, { record: timeline.record, state: timeline.state });
  };

  return {
    gameId: null,
    state: null,
    record: null,
    revision: 0,
    loading: false,
    loadError: null,
    warnings: [],
    save: INITIAL_SAVE,
    hideSecrets: true,

    async open(id) {
      if (get().gameId === id && timeline) return true;
      await get().close();
      set({ loading: true, loadError: null, warnings: [], gameId: id });
      try {
        const repo = await getRepository();
        const loaded = await repo.loadGame(id);
        const { timeline: t, failure } = Timeline.load(loaded.record);
        timeline = t;
        scheduler = makeScheduler(set);
        const warnings = [...loaded.warnings];
        if (failure && !loaded.failure) warnings.push(`Historique tronqué à l’action ${failure.index + 1}.`);
        set({
          loading: false,
          state: t.state,
          record: t.record,
          revision: get().revision + 1,
          warnings,
          save: { status: 'saved', error: null, savedVersion: t.length, savedAt: null },
          hideSecrets: useAppStore.getState().settings.hideSecretsByDefault,
        });
        return true;
      } catch (e) {
        timeline = null;
        set({ loading: false, loadError: e instanceof Error ? e.message : String(e), state: null, record: null });
        return false;
      }
    },

    async create(setup) {
      const errors = setupErrors(setup);
      if (errors.length > 0) return { ok: false, error: errors.map((e) => e.message).join('\n') };
      await get().close();
      const { timeline: t } = Timeline.load({ setup, actions: [] });
      try {
        const repo = await getRepository();
        await repo.saveGame(t.record, t.state);
      } catch (e) {
        return { ok: false, error: `La partie n’a pas pu être enregistrée : ${e instanceof Error ? e.message : String(e)}` };
      }
      timeline = t;
      scheduler = makeScheduler(set);
      set({
        gameId: setup.id,
        state: t.state,
        record: t.record,
        revision: get().revision + 1,
        loadError: null,
        warnings: [],
        save: { status: 'saved', error: null, savedVersion: 0, savedAt: new Date().toISOString() },
        hideSecrets: useAppStore.getState().settings.hideSecretsByDefault,
      });
      void useAppStore.getState().refreshGames();
      return { ok: true };
    },

    async close() {
      if (scheduler) await scheduler.flush();
      timeline = null;
      scheduler = null;
      set({ gameId: null, state: null, record: null, warnings: [], save: INITIAL_SAVE });
      void useAppStore
        .getState()
        .refreshGames()
        .catch(() => undefined);
    },

    dispatch(action) {
      if (!timeline) return { ok: false, error: 'Aucune partie ouverte.' };
      const r = timeline.dispatch(action);
      if (!r.ok) return { ok: false, error: r.error, code: r.code };
      publish();
      return { ok: true };
    },

    undo() {
      if (!timeline) return { ok: false, error: 'Aucune partie ouverte.' };
      if (!timeline.undo()) return { ok: false, error: 'Rien à annuler.' };
      publish();
      return { ok: true };
    },

    rewindTo(count) {
      if (!timeline) return { ok: false, error: 'Aucune partie ouverte.' };
      try {
        timeline.rewindTo(count);
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
      publish();
      return { ok: true };
    },

    replace(index, action) {
      if (!timeline) return { ok: false, failure: { index, action, message: 'Aucune partie ouverte.', code: 'no-game' } };
      const r = timeline.replace(index, action);
      if (r.ok) publish();
      return r;
    },

    retrySave() {
      scheduler?.retry();
    },

    flush() {
      return scheduler ? scheduler.flush() : Promise.resolve();
    },

    setHideSecrets(hide) {
      set({ hideSecrets: hide });
    },

    dismissWarnings() {
      set({ warnings: [] });
    },
  };
});
