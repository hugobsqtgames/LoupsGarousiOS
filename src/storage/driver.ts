/**
 * Interface minimale d'accès SQL, implémentée par expo-sqlite dans l'app et
 * par node:sqlite dans les tests (même moteur SQLite, mêmes requêtes).
 */
export type SqlParam = string | number | null;

export interface SqlDriver {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParam[]): Promise<{ changes: number }>;
  all<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlParam[]): Promise<T | null>;
  /** Exécute `task` dans une transaction (BEGIN / COMMIT, ROLLBACK en cas d'erreur). */
  transaction(task: () => Promise<void>): Promise<void>;
  close(): Promise<void>;
}

/** Sérialise les opérations : évite les transactions imbriquées ou concurrentes. */
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const next = this.tail.then(task, task);
    this.tail = next.catch(() => undefined);
    return next;
  }
}
