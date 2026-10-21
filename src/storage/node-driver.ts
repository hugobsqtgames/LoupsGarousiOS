import type { SqlDriver, SqlParam } from './driver';

/**
 * Pilote SQLite pour Node (tests uniquement) basé sur le module natif
 * `node:sqlite`. Mêmes requêtes que expo-sqlite, base en mémoire ou fichier.
 */
export function openNodeDriver(path = ':memory:'): SqlDriver & { raw: unknown } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (p: string) => NodeDb };
  const db = new DatabaseSync(path);
  return {
    raw: db,
    exec: async (sql) => {
      db.exec(sql);
    },
    run: async (sql, params: SqlParam[] = []) => {
      const r = db.prepare(sql).run(...params);
      return { changes: Number(r.changes) };
    },
    all: async <T,>(sql: string, params: SqlParam[] = []) => db.prepare(sql).all(...params) as T[],
    first: async <T,>(sql: string, params: SqlParam[] = []) => (db.prepare(sql).get(...params) as T | undefined) ?? null,
    transaction: async (task) => {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    close: async () => db.close(),
  };
}

interface NodeStatement {
  run(...p: SqlParam[]): { changes: number | bigint };
  all(...p: SqlParam[]): unknown[];
  get(...p: SqlParam[]): unknown;
}
interface NodeDb {
  exec(sql: string): void;
  prepare(sql: string): NodeStatement;
  close(): void;
}
