import * as SQLite from 'expo-sqlite';
import type { SqlDriver, SqlParam } from './driver';

export const DATABASE_NAME = 'loups-garous.db';

/** Pilote expo-sqlite (iOS, Android et web via wasm). */
export async function openExpoDriver(name = DATABASE_NAME): Promise<SqlDriver> {
  const db = await SQLite.openDatabaseAsync(name);
  if (process.env.EXPO_OS !== 'web') {
    await db.execAsync('PRAGMA journal_mode = WAL;');
  }
  await db.execAsync('PRAGMA foreign_keys = ON;');
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params: SqlParam[] = []) => {
      const r = await db.runAsync(sql, params);
      return { changes: r.changes };
    },
    all: <T,>(sql: string, params: SqlParam[] = []) => db.getAllAsync<T>(sql, params),
    first: <T,>(sql: string, params: SqlParam[] = []) => db.getFirstAsync<T>(sql, params),
    transaction: (task) => db.withTransactionAsync(task),
    close: () => db.closeAsync(),
  };
}
