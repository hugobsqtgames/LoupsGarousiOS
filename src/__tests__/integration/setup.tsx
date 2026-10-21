/**
 * Outils communs aux tests d'intégration : vraie base SQLite en mémoire
 * (node:sqlite), vrais stores et vrais écrans expo-router.
 * Chaque fichier de test ne contient qu'un seul parcours naviguant, car
 * expo-router conserve un état global de navigation au sein d'un fichier.
 */
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { DEFAULT_SETTINGS } from '@/settings/settings';
import { useAppStore } from '@/state/app-store';
import { emptyDraft } from '@/state/draft';
import { useDraftStore } from '@/state/draft-store';
import { useGameStore } from '@/state/game-store';
import { configureDriverFactory } from '@/state/services';
import type { SqlDriver } from '@/storage/driver';
import { openNodeDriver } from '@/storage/node-driver';

// Le premier rendu de l'arbre complet peut dépasser 5 s (instrumentation de couverture).
jest.setTimeout(30_000);

export async function resetApp(db: SqlDriver = openNodeDriver()): Promise<SqlDriver> {
  configureDriverFactory(async () => db);
  useAppStore.setState({ status: 'loading', settings: DEFAULT_SETTINGS, settingsError: null, games: [], compositions: [], customRoles: [] });
  await useGameStore.getState().close();
  useDraftStore.setState({ draft: emptyDraft(), step: 0, hydrated: false });
  return db;
}

export async function renderApp(initialUrl = '/') {
  await renderRouter('./src/app', { initialUrl });
  await waitFor(() => expect(useAppStore.getState().status).toBe('ready'));
}

export async function pressAndConfirm(testID: string) {
  await pause();
  await fireEvent.press(await screen.findByTestId(testID));
  await fireEvent.press(await screen.findByTestId('dialog-confirm'));
}

export async function addPlayers(names: string[]) {
  for (const n of names) {
    await fireEvent.changeText(await screen.findByTestId('player-name-input'), n);
    await waitFor(() => expect(screen.getByTestId('player-name-input').props.value).toBe(n));
    await fireEvent.press(screen.getByTestId('add-player'));
  }
}

/**
 * Laisse passer le délai anti-double-appui des boutons (450 ms).
 * renderRouter active des minuteurs simulés : on avance l'horloge simulée.
 */
export async function pause(ms = 500): Promise<void> {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

/** Appuie sur un bouton en respectant le délai anti-double-appui. */
export async function tap(testID: string) {
  await pause();
  await fireEvent.press(await screen.findByTestId(testID));
}

/** Attend qu'une vérification asynchrone (ex. lecture en base) réussisse, en avançant l'horloge simulée. */
export async function eventually(check: () => Promise<void>, attempts = 60): Promise<void> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await check();
      return;
    } catch (e) {
      last = e;
    }
    await act(async () => {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });
  }
  throw last;
}
