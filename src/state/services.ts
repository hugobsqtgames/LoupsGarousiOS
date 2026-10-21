import { Repository } from '@/storage/repository';
import type { SqlDriver } from '@/storage/driver';

/**
 * Accès unique à la base locale. En test, `configureDriverFactory` permet
 * d'injecter une base SQLite en mémoire.
 */
let driverFactory: () => Promise<SqlDriver> = async () => {
  const { openExpoDriver } = await import('@/storage/expo-driver');
  return openExpoDriver();
};
let repoPromise: Promise<Repository> | null = null;

export function configureDriverFactory(factory: () => Promise<SqlDriver>): void {
  driverFactory = factory;
  repoPromise = null;
}

export function getRepository(): Promise<Repository> {
  if (!repoPromise) {
    repoPromise = driverFactory()
      .then((db) => Repository.open(db))
      .catch((e: unknown) => {
        repoPromise = null;
        throw e;
      });
  }
  return repoPromise;
}
