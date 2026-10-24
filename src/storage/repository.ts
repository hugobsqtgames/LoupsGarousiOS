import { hashString, phaseLabel, replay } from '@/engine';
import type { CustomRoleDef, GameRecord, GameState, ReplayFailure, RoleId, Winner } from '@/engine';
import { SerialQueue, type SqlDriver } from './driver';
import { migrate, SCHEMA_VERSION } from './migrations';
import { DataError, parseActions, parseCustomRoles, parseSetup, safeJsonParse } from './validation';

export interface GameSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'ended';
  phaseLabel: string;
  playerCount: number;
  aliveCount: number;
  winner: Winner | null;
  winners: string[];
  /** Rôles distribués au départ. */
  roles: RoleId[];
  /** Rôles des gagnants (pour les statistiques). */
  winnerRoles: RoleId[];
  nights: number;
  days: number;
  actionCount: number;
  /** Détail par joueur (statistiques par joueur). Absent des résumés anciens, recalculé à l'ouverture. */
  players?: PlayerSummary[];
  /** Version du calcul du résumé. */
  summaryVersion?: number;
}

export interface PlayerSummary {
  name: string;
  /** Carte reçue au départ. */
  roleId: RoleId;
  /** Rôle en fin de partie (Voleur, Servante…). */
  finalRoleId: RoleId;
  team: string;
  won: boolean;
  alive: boolean;
  deathPhase: string | null;
  /** Éliminé(e) pendant la première nuit. */
  firstNightDeath: boolean;
  /** Nombre de fois devenu(e) maire (élection ou désignation). */
  mayorTimes: number;
}

export const SUMMARY_VERSION = 2;

export interface SavedComposition {
  id: string;
  name: string;
  createdAt: string;
  roles: RoleId[];
  extraCards: RoleId[];
  variants: unknown;
  playerNames: string[];
}

export interface LoadedGame {
  record: GameRecord;
  source: 'primary' | 'backup';
  /** Action devenue invalide lors du rejeu (données partiellement corrompues). */
  failure: ReplayFailure | null;
  warnings: string[];
}

interface GameRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'ended';
  summary_json: string;
  setup_json: string;
  actions_json: string;
  action_count: number;
  checksum: string;
  format_version: number;
}

export const EXPORT_APP_ID = 'loups-garous-mj';
export const EXPORT_VERSION = 1;

export interface ExportBundle {
  app: typeof EXPORT_APP_ID;
  exportVersion: number;
  exportedAt: string;
  schemaVersion: number;
  games: GameRecord[];
  compositions: SavedComposition[];
  customRoles: CustomRoleDef[];
  settings: Record<string, unknown>;
}

export interface ImportReport {
  games: number;
  renamedGames: number;
  compositions: number;
  customRoles: number;
  settings: boolean;
}

export function summarize(record: GameRecord, state: GameState, updatedAt: string): GameSummary {
  const winners = state.victory?.winners ?? [];
  return {
    id: record.setup.id,
    name: record.setup.name,
    createdAt: record.setup.createdAt,
    updatedAt,
    status: state.phase.kind === 'ended' ? 'ended' : 'active',
    phaseLabel: phaseLabel(state.phase),
    playerCount: state.players.length,
    aliveCount: state.players.filter((p) => p.alive).length,
    winner: state.phase.kind === 'ended' ? (state.victory?.winner ?? null) : null,
    winners,
    roles: record.setup.players.map((p) => record.setup.assignments[p.id]),
    winnerRoles: state.players.filter((p) => winners.includes(p.id)).map((p) => p.roleId),
    nights: state.nightNumber,
    days: state.dayNumber,
    actionCount: record.actions.length,
    players: state.players.map((p) => ({
      name: p.name,
      roleId: p.originalRoleId,
      finalRoleId: p.roleId,
      team: p.team,
      won: state.phase.kind === 'ended' && winners.includes(p.id),
      alive: p.alive,
      deathPhase: p.death?.phaseLabel ?? null,
      firstNightDeath: p.death?.phaseLabel === 'Aube 1' || p.death?.phaseLabel === 'Nuit 1',
      mayorTimes: state.log.filter((e) => e.event.type === 'mayor' && e.event.playerId === p.id && e.event.how !== 'removed').length,
    })),
    summaryVersion: SUMMARY_VERSION,
  };
}

export function checksumOf(setupJson: string, actionsJson: string): string {
  return hashString(`${setupJson}\u0000${actionsJson}`);
}

/** Accès aux données locales. Toutes les opérations sont sérialisées. */
export class Repository {
  private readonly queue = new SerialQueue();

  private constructor(private readonly db: SqlDriver) {}

  static async open(db: SqlDriver): Promise<Repository> {
    await migrate(db);
    const repo = new Repository(db);
    await repo.upgradeSummaries();
    return repo;
  }

  /**
   * Recalcule les résumés produits par une version antérieure (détail par
   * joueur). Une partie illisible est laissée telle quelle.
   */
  async upgradeSummaries(): Promise<number> {
    return this.queue.run(async () => {
      const rows = await this.db.all<GameRow>('SELECT * FROM games');
      let upgraded = 0;
      for (const row of rows) {
        let version = 0;
        try {
          version = (JSON.parse(row.summary_json) as GameSummary).summaryVersion ?? 0;
        } catch {
          continue;
        }
        if (version >= SUMMARY_VERSION) continue;
        try {
          const record = this.decodeRow(row);
          const res = replay(record);
          const summary = summarize(record, res.state, row.updated_at);
          await this.db.run('UPDATE games SET summary_json = ? WHERE id = ?', [JSON.stringify(summary), row.id]);
          upgraded += 1;
        } catch {
          // Données altérées : le chargement de la partie signalera le problème.
        }
      }
      return upgraded;
    });
  }

  get driver(): SqlDriver {
    return this.db;
  }

  /* ------------------------------ Parties ------------------------------ */

  /**
   * Enregistre une partie. La version précédente est copiée dans la table de
   * secours dans la même transaction : une écriture interrompue laisse
   * toujours une version cohérente.
   */
  saveGame(record: GameRecord, state: GameState, now = new Date().toISOString()): Promise<void> {
    const setupJson = JSON.stringify(record.setup);
    const actionsJson = JSON.stringify(record.actions);
    const summary = summarize(record, state, now);
    return this.queue.run(() =>
      this.db.transaction(async () => {
        await this.db.run('INSERT OR REPLACE INTO games_backup SELECT * FROM games WHERE id = ?', [record.setup.id]);
        await this.db.run(
          `INSERT OR REPLACE INTO games (id, name, created_at, updated_at, status, summary_json, setup_json, actions_json, action_count, checksum, format_version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [record.setup.id, record.setup.name, record.setup.createdAt, now, summary.status, JSON.stringify(summary), setupJson, actionsJson, record.actions.length, checksumOf(setupJson, actionsJson), record.setup.formatVersion],
        );
      }),
    );
  }

  private decodeRow(row: GameRow): GameRecord {
    if (checksumOf(row.setup_json, row.actions_json) !== row.checksum) throw new DataError('Somme de contrôle invalide : données altérées.');
    const setup = parseSetup(safeJsonParse(row.setup_json, 'configuration'));
    const actions = parseActions(safeJsonParse(row.actions_json, 'historique'));
    if (actions.length !== row.action_count) throw new DataError('Historique incomplet.');
    return { setup, actions };
  }

  /** Charge une partie ; bascule sur la copie de secours si la version principale est illisible. */
  loadGame(id: string): Promise<LoadedGame> {
    return this.queue.run(async () => {
      const warnings: string[] = [];
      const primary = await this.db.first<GameRow>('SELECT * FROM games WHERE id = ?', [id]);
      const backup = await this.db.first<GameRow>('SELECT * FROM games_backup WHERE id = ?', [id]);
      if (!primary && !backup) throw new DataError('Partie introuvable.');
      let record: GameRecord | null = null;
      let source: LoadedGame['source'] = 'primary';
      if (primary) {
        try {
          record = this.decodeRow(primary);
        } catch (e) {
          warnings.push(`Sauvegarde principale illisible : ${(e as Error).message}`);
        }
      }
      if (!record && backup) {
        try {
          record = this.decodeRow(backup);
          source = 'backup';
          warnings.push('La copie de secours a été utilisée : la dernière action peut manquer.');
        } catch (e) {
          warnings.push(`Copie de secours illisible : ${(e as Error).message}`);
        }
      }
      if (!record) throw new DataError(warnings.join(' '));
      const res = replay(record);
      if (res.failure) warnings.push(`Historique incohérent à partir de l’action ${res.failure.index + 1} : ${res.failure.message}`);
      return { record, source, failure: res.failure, warnings };
    });
  }

  listGames(): Promise<GameSummary[]> {
    return this.queue.run(async () => {
      const rows = await this.db.all<{ summary_json: string; id: string }>('SELECT id, summary_json FROM games ORDER BY updated_at DESC');
      const out: GameSummary[] = [];
      for (const r of rows) {
        try {
          out.push(JSON.parse(r.summary_json) as GameSummary);
        } catch {
          out.push({
            id: r.id,
            name: 'Partie illisible',
            createdAt: '',
            updatedAt: '',
            status: 'active',
            phaseLabel: '?',
            playerCount: 0,
            aliveCount: 0,
            winner: null,
            winners: [],
            roles: [],
            winnerRoles: [],
            nights: 0,
            days: 0,
            actionCount: 0,
          });
        }
      }
      return out;
    });
  }

  deleteGame(id: string): Promise<void> {
    return this.queue.run(() =>
      this.db.transaction(async () => {
        await this.db.run('DELETE FROM games WHERE id = ?', [id]);
        await this.db.run('DELETE FROM games_backup WHERE id = ?', [id]);
      }),
    );
  }

  /* ----------------------------- Paramètres ---------------------------- */

  getSetting<T>(key: string): Promise<T | null> {
    return this.queue.run(async () => {
      const row = await this.db.first<{ value_json: string }>('SELECT value_json FROM settings WHERE key = ?', [key]);
      if (!row) return null;
      try {
        return JSON.parse(row.value_json) as T;
      } catch {
        return null;
      }
    });
  }

  setSetting(key: string, value: unknown): Promise<void> {
    return this.queue.run(async () => {
      await this.db.run('INSERT OR REPLACE INTO settings (key, value_json) VALUES (?, ?)', [key, JSON.stringify(value)]);
    });
  }

  /* ---------------------------- Compositions --------------------------- */

  listCompositions(): Promise<SavedComposition[]> {
    return this.queue.run(async () => {
      const rows = await this.db.all<{ data_json: string }>('SELECT data_json FROM compositions ORDER BY created_at DESC');
      return rows.flatMap((r) => {
        try {
          return [JSON.parse(r.data_json) as SavedComposition];
        } catch {
          return [];
        }
      });
    });
  }

  saveComposition(c: SavedComposition): Promise<void> {
    return this.queue.run(async () => {
      await this.db.run('INSERT OR REPLACE INTO compositions (id, name, data_json, created_at) VALUES (?, ?, ?, ?)', [c.id, c.name, JSON.stringify(c), c.createdAt]);
    });
  }

  deleteComposition(id: string): Promise<void> {
    return this.queue.run(async () => {
      await this.db.run('DELETE FROM compositions WHERE id = ?', [id]);
    });
  }

  /* ------------------------- Rôles personnalisés ------------------------ */

  listCustomRoles(): Promise<CustomRoleDef[]> {
    return this.queue.run(async () => {
      const rows = await this.db.all<{ data_json: string }>('SELECT data_json FROM custom_roles ORDER BY created_at ASC');
      const out: CustomRoleDef[] = [];
      for (const r of rows) {
        try {
          out.push(...parseCustomRoles([JSON.parse(r.data_json)]));
        } catch {
          // Une définition invalide est ignorée plutôt que de bloquer l'app.
        }
      }
      return out;
    });
  }

  async saveCustomRole(role: CustomRoleDef, now = new Date().toISOString()): Promise<void> {
    const [valid] = parseCustomRoles([role]);
    return this.queue.run(async () => {
      const existing = await this.db.first<{ created_at: string }>('SELECT created_at FROM custom_roles WHERE id = ?', [valid.id]);
      await this.db.run('INSERT OR REPLACE INTO custom_roles (id, data_json, created_at) VALUES (?, ?, ?)', [valid.id, JSON.stringify(valid), existing?.created_at ?? now]);
    });
  }

  deleteCustomRole(id: string): Promise<void> {
    return this.queue.run(async () => {
      await this.db.run('DELETE FROM custom_roles WHERE id = ?', [id]);
    });
  }

  /* -------------------------- Export / import -------------------------- */

  exportData(now = new Date().toISOString()): Promise<ExportBundle> {
    return this.queue.run(async () => {
      const rows = await this.db.all<GameRow>('SELECT * FROM games ORDER BY created_at ASC');
      const games: GameRecord[] = [];
      for (const r of rows) {
        try {
          games.push(this.decodeRow(r));
        } catch {
          // Les parties corrompues ne sont pas exportées.
        }
      }
      const comps = await this.db.all<{ data_json: string }>('SELECT data_json FROM compositions');
      const roles = await this.db.all<{ data_json: string }>('SELECT data_json FROM custom_roles');
      const settingsRows = await this.db.all<{ key: string; value_json: string }>('SELECT key, value_json FROM settings');
      const settings: Record<string, unknown> = {};
      for (const s of settingsRows) {
        try {
          settings[s.key] = JSON.parse(s.value_json);
        } catch {
          // ignoré
        }
      }
      return {
        app: EXPORT_APP_ID,
        exportVersion: EXPORT_VERSION,
        exportedAt: now,
        schemaVersion: SCHEMA_VERSION,
        games,
        // Une ligne illisible est écartée : elle ne doit pas empêcher la sauvegarde du reste.
        compositions: comps.flatMap((c) => {
          try {
            return [JSON.parse(c.data_json) as SavedComposition];
          } catch {
            return [];
          }
        }),
        customRoles: roles.flatMap((r) => {
          try {
            return parseCustomRoles([JSON.parse(r.data_json)]);
          } catch {
            return [];
          }
        }),
        settings,
      };
    });
  }

  /**
   * Importe une sauvegarde. Tout est validé avant la moindre écriture, puis
   * écrit dans une seule transaction (tout ou rien). Les parties dont
   * l'identifiant existe déjà sont importées sous un nouvel identifiant.
   */
  async importData(text: string, opts: { includeSettings: boolean } = { includeSettings: false }): Promise<ImportReport> {
    const raw = safeJsonParse(text, 'fichier importé');
    if (typeof raw !== 'object' || raw === null) throw new DataError('Fichier d’import invalide.');
    const b = raw as Record<string, unknown>;
    if (b.app !== EXPORT_APP_ID) throw new DataError('Ce fichier ne provient pas de cette application.');
    if (typeof b.exportVersion !== 'number' || b.exportVersion > EXPORT_VERSION) throw new DataError('Version d’export non prise en charge.');
    const games = Array.isArray(b.games) ? b.games : [];
    const parsedGames = games.map((g, i) => {
      if (typeof g !== 'object' || g === null) throw new DataError(`Partie ${i + 1} invalide.`);
      const gg = g as Record<string, unknown>;
      const record = { setup: parseSetup(gg.setup), actions: parseActions(gg.actions) };
      const res = replay(record);
      if (res.failure) throw new DataError(`Partie « ${record.setup.name} » incohérente : ${res.failure.message}`);
      return { record, state: res.state };
    });
    const compositions = (Array.isArray(b.compositions) ? b.compositions : []).map((c, i) => {
      if (typeof c !== 'object' || c === null) throw new DataError(`Composition ${i + 1} invalide.`);
      const cc = c as Record<string, unknown>;
      const roleList = (v: unknown) => Array.isArray(v) && v.every((r) => typeof r === 'string');
      if (typeof cc.id !== 'string' || typeof cc.name !== 'string' || !roleList(cc.roles) || (cc.extraCards !== undefined && !roleList(cc.extraCards)) || (cc.playerNames !== undefined && !roleList(cc.playerNames))) {
        throw new DataError(`Composition ${i + 1} invalide.`);
      }
      return cc as unknown as SavedComposition;
    });
    const customRoles = parseCustomRoles(b.customRoles ?? []);
    const settings = typeof b.settings === 'object' && b.settings !== null ? (b.settings as Record<string, unknown>) : {};

    return this.queue.run(async () => {
      const report: ImportReport = { games: 0, renamedGames: 0, compositions: 0, customRoles: 0, settings: false };
      await this.db.transaction(async () => {
        for (const { record, state } of parsedGames) {
          let rec = record;
          const exists = await this.db.first<{ id: string }>('SELECT id FROM games WHERE id = ?', [record.setup.id]);
          if (exists) {
            const newId = `${record.setup.id}-import-${Date.now().toString(36)}-${report.games}`;
            rec = { ...record, setup: { ...record.setup, id: newId } };
            report.renamedGames += 1;
          }
          const setupJson = JSON.stringify(rec.setup);
          const actionsJson = JSON.stringify(rec.actions);
          const now = new Date().toISOString();
          const summary = summarize(rec, state, now);
          await this.db.run(
            `INSERT INTO games (id, name, created_at, updated_at, status, summary_json, setup_json, actions_json, action_count, checksum, format_version)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [rec.setup.id, rec.setup.name, rec.setup.createdAt, now, summary.status, JSON.stringify(summary), setupJson, actionsJson, rec.actions.length, checksumOf(setupJson, actionsJson), rec.setup.formatVersion],
          );
          report.games += 1;
        }
        for (const c of compositions) {
          await this.db.run('INSERT OR REPLACE INTO compositions (id, name, data_json, created_at) VALUES (?, ?, ?, ?)', [c.id, c.name, JSON.stringify(c), c.createdAt ?? new Date().toISOString()]);
          report.compositions += 1;
        }
        for (const r of customRoles) {
          await this.db.run('INSERT OR REPLACE INTO custom_roles (id, data_json, created_at) VALUES (?, ?, ?)', [r.id, JSON.stringify(r), new Date().toISOString()]);
          report.customRoles += 1;
        }
        if (opts.includeSettings) {
          for (const [k, v] of Object.entries(settings)) await this.db.run('INSERT OR REPLACE INTO settings (key, value_json) VALUES (?, ?)', [k, JSON.stringify(v)]);
          report.settings = Object.keys(settings).length > 0;
        }
      });
      return report;
    });
  }

  /** Efface toutes les données locales (après confirmation explicite dans l'UI). */
  resetAll(): Promise<void> {
    return this.queue.run(() =>
      this.db.transaction(async () => {
        for (const t of ['games', 'games_backup', 'settings', 'compositions', 'custom_roles']) await this.db.run(`DELETE FROM ${t}`);
      }),
    );
  }

  /** Statistiques de stockage (taille approximative des données). */
  storageStats(): Promise<{ games: number; bytes: number }> {
    return this.queue.run(async () => {
      const row = await this.db.first<{ n: number; bytes: number | null }>('SELECT COUNT(*) AS n, SUM(LENGTH(setup_json) + LENGTH(actions_json) + LENGTH(summary_json)) AS bytes FROM games');
      return { games: row?.n ?? 0, bytes: row?.bytes ?? 0 };
    });
  }
}
