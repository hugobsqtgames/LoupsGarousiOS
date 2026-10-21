import type { SqlDriver } from './driver';

export interface Migration {
  version: number;
  description: string;
  sql: string;
}

const GAME_COLUMNS = `
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'ended')),
  summary_json TEXT NOT NULL,
  setup_json TEXT NOT NULL,
  actions_json TEXT NOT NULL,
  action_count INTEGER NOT NULL,
  checksum TEXT NOT NULL,
  format_version INTEGER NOT NULL`;

/** Migrations versionnées, appliquées dans l'ordre et une seule fois (PRAGMA user_version). */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Schéma initial : parties, sauvegardes de secours, paramètres, compositions, rôles personnalisés',
    sql: `
      CREATE TABLE IF NOT EXISTS games (${GAME_COLUMNS});
      CREATE INDEX IF NOT EXISTS games_updated_idx ON games (updated_at);
      CREATE TABLE IF NOT EXISTS games_backup (${GAME_COLUMNS});
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS compositions (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, data_json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS custom_roles (id TEXT PRIMARY KEY NOT NULL, data_json TEXT NOT NULL, created_at TEXT NOT NULL);
    `,
  },
];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export async function getSchemaVersion(db: SqlDriver): Promise<number> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/**
 * Applique les migrations manquantes. Chaque migration et la mise à jour de
 * version sont exécutées dans la même transaction : une migration
 * interrompue est entièrement annulée.
 */
export async function migrate(db: SqlDriver, migrations: Migration[] = MIGRATIONS): Promise<{ from: number; to: number }> {
  const from = await getSchemaVersion(db);
  const latest = migrations.length ? migrations[migrations.length - 1].version : 0;
  if (from > latest) {
    throw new Error(`Base de données créée par une version plus récente de l’application (schéma ${from} > ${latest}).`);
  }
  for (const m of migrations) {
    if (m.version <= from) continue;
    await db.transaction(async () => {
      await db.exec(m.sql);
      await db.exec(`PRAGMA user_version = ${m.version}`);
    });
  }
  return { from, to: await getSchemaVersion(db) };
}
