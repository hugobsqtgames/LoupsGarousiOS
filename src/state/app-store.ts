import { create } from 'zustand';
import type { CustomRoleDef } from '@/engine';
import { DEFAULT_SETTINGS, normalizeSettings, type AppSettings } from '@/settings/settings';
import type { GameSummary, ImportReport, SavedComposition } from '@/storage/repository';
import { getRepository } from './services';

export const SETTINGS_KEY = 'app-settings';

/** Ferme la partie ouverte si elle est concernée (`null` : toutes). Fourni par le magasin de partie. */
let closeOpenGame: (id: string | null) => Promise<void> = async () => undefined;
export function registerOpenGameGuard(fn: (id: string | null) => Promise<void>): void {
  closeOpenGame = fn;
}

interface AppStore {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  settings: AppSettings;
  /** Erreur lors de la dernière écriture des paramètres. */
  settingsError: string | null;
  games: GameSummary[];
  compositions: SavedComposition[];
  customRoles: CustomRoleDef[];
  init(): Promise<void>;
  updateSettings(patch: Partial<AppSettings>): Promise<boolean>;
  resetSettings(): Promise<boolean>;
  refreshGames(): Promise<void>;
  deleteGame(id: string): Promise<void>;
  saveComposition(c: SavedComposition): Promise<void>;
  deleteComposition(id: string): Promise<void>;
  saveCustomRole(r: CustomRoleDef): Promise<void>;
  deleteCustomRole(id: string): Promise<void>;
  exportJson(): Promise<string>;
  importJson(text: string, includeSettings: boolean): Promise<ImportReport>;
  resetAll(): Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  status: 'loading',
  error: null,
  settings: DEFAULT_SETTINGS,
  settingsError: null,
  games: [],
  compositions: [],
  customRoles: [],

  async init() {
    set({ status: 'loading', error: null });
    try {
      const repo = await getRepository();
      const [raw, games, compositions, customRoles] = await Promise.all([
        repo.getSetting<unknown>(SETTINGS_KEY),
        repo.listGames(),
        repo.listCompositions(),
        repo.listCustomRoles(),
      ]);
      set({ status: 'ready', settings: normalizeSettings(raw), games, compositions, customRoles });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  },

  async updateSettings(patch) {
    const previous = get().settings;
    const next = normalizeSettings({ ...previous, ...patch });
    set({ settings: next });
    try {
      const repo = await getRepository();
      await repo.setSetting(SETTINGS_KEY, next);
      set({ settingsError: null });
      return true;
    } catch (e) {
      // L'écriture a échoué : on revient à l'état réellement enregistré.
      set({ settings: previous, settingsError: e instanceof Error ? e.message : String(e) });
      return false;
    }
  },

  resetSettings() {
    return get().updateSettings({ ...DEFAULT_SETTINGS, onboardingSeen: true });
  },

  async refreshGames() {
    const repo = await getRepository();
    set({ games: await repo.listGames() });
  },

  async deleteGame(id) {
    await closeOpenGame(id);
    const repo = await getRepository();
    await repo.deleteGame(id);
    await get().refreshGames();
  },

  async saveComposition(c) {
    const repo = await getRepository();
    await repo.saveComposition(c);
    set({ compositions: await repo.listCompositions() });
  },

  async deleteComposition(id) {
    const repo = await getRepository();
    await repo.deleteComposition(id);
    set({ compositions: await repo.listCompositions() });
  },

  async saveCustomRole(r) {
    const repo = await getRepository();
    await repo.saveCustomRole(r);
    set({ customRoles: await repo.listCustomRoles() });
  },

  async deleteCustomRole(id) {
    const repo = await getRepository();
    await repo.deleteCustomRole(id);
    set({ customRoles: await repo.listCustomRoles() });
  },

  async exportJson() {
    const repo = await getRepository();
    return JSON.stringify(await repo.exportData(), null, 2);
  },

  async importJson(text, includeSettings) {
    // La partie ouverte est enregistrée et fermée avant l'import.
    await closeOpenGame(null);
    const repo = await getRepository();
    const report = await repo.importData(text, { includeSettings });
    await get().init();
    return report;
  },

  async resetAll() {
    await closeOpenGame(null);
    const repo = await getRepository();
    await repo.resetAll();
    await get().init();
  },
}));
