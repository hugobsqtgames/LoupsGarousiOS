import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { getRepository } from '@/state/services';
import { useAppStore } from '@/state/app-store';
import { useGameStore } from '@/state/game-store';
import type { SqlDriver } from '@/storage/driver';
import { addPlayers, pressAndConfirm, renderApp, resetApp, tap } from './setup';

jest.spyOn(process, 'emitWarning').mockImplementation(() => undefined);
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));
jest.mock('@/audio/expo-backend', () => ({ expoAudioBackend: jest.requireActual('./mocks').fakeAudioBackend }));

let db: SqlDriver;
beforeEach(async () => {
  db = await resetApp();
});

async function playNight() {
  await tap('open-night');
  for (let i = 0; i < 30; i++) {
    if (screen.queryByTestId('resolve-night')) break;
    await screen.findByTestId('submit-step');
    const multi = screen.queryAllByTestId(/^multi-grid-/).filter((el) => !el.props.accessibilityState?.disabled);
    if (multi.length >= 2 && screen.queryByText(/sélectionné/)) {
      await fireEvent.press(multi[0]);
      await fireEvent.press(multi[1]);
    } else if (screen.queryByTestId('wolfhound-village')) await fireEvent.press(screen.getByTestId('wolfhound-village'));
    else if (screen.queryByTestId('thief-take-0')) await fireEvent.press(screen.getByTestId('thief-take-0'));
    else if (screen.queryByTestId('no-target')) {
      const grid = screen.queryAllByTestId(/^target-grid-/).filter((el) => !el.props.accessibilityState?.disabled);
      if (grid.length) await fireEvent.press(grid[grid.length - 1]);
      else await fireEvent.press(screen.getByTestId('no-target'));
    }
    await tap('submit-step');
  }
  await pressAndConfirm('resolve-night');
  await waitFor(() => expect(useGameStore.getState().state?.phase.kind).toBe('dawn'));
}

async function resolveDecisions() {
  for (let guard = 0; guard < 10 && useGameStore.getState().state!.pending.length; guard++) {
    if (screen.queryByTestId('servant-refuse')) await fireEvent.press(screen.getByTestId('servant-refuse'));
    else if (screen.queryByTestId('decision-none')) {
      await fireEvent.press(screen.getByTestId('decision-none'));
      await fireEvent.press(await screen.findByTestId('dialog-confirm'));
    } else {
      const grid = screen.getAllByTestId(/^decision-grid-/);
      await fireEvent.press(grid[0]);
      await pressAndConfirm('decision-confirm');
    }
  }
}

describe('partie complète via l’interface', () => {
  it('crée, joue une nuit, élit un maire, vote avec correction, sauvegarde et reprend après redémarrage', async () => {
    await renderApp('/new');
    await addPlayers(['Alice', 'Bruno', 'Chloé', 'David', 'Emma', 'Farid', 'Gaëlle', 'Hugo']);
    await tap('next-step');
    await tap('auto-compose');
    await waitFor(() => expect(screen.getByTestId('card-count')).toHaveTextContent('8 / 8'));
    for (let i = 0; i < 3; i++) await tap('next-step');
    await screen.findByTestId('launch-game');
    // Aucune erreur bloquante (des avertissements restent possibles selon le tirage).
    expect(screen.queryByText(/problème\(s\) bloquant/)).toBeNull();
    await pressAndConfirm('launch-game');
    await waitFor(() => expect(useGameStore.getState().state?.phase.kind).toBe('night'));
    const gameId = useGameStore.getState().gameId!;
    expect((await (await getRepository()).listGames()).map((g) => g.id)).toEqual([gameId]);

    await playNight();
    expect(await screen.findByTestId('dawn-announce')).toBeTruthy();
    await resolveDecisions();
    expect(useGameStore.getState().state!.pending).toEqual([]);
    if (useGameStore.getState().state!.victory) return; // composition improbable : victoire dès la nuit 1
    await pressAndConfirm('start-day');
    await waitFor(() => expect(useGameStore.getState().state?.phase.kind).toBe('day'));

    // Élection du maire avec correction d'une voix
    await tap('open-mayor');
    await tap('open-ballot');
    const alive = useGameStore.getState().state!.players.filter((p) => p.alive);
    const first = alive[0].id;
    await fireEvent.press(await screen.findByTestId(`vote-plus-${first}`));
    await fireEvent.press(screen.getByTestId(`vote-plus-${first}`));
    expect(screen.getByTestId(`vote-count-${first}`)).toHaveTextContent('2');
    await fireEvent.press(screen.getByTestId(`vote-minus-${first}`));
    expect(screen.getByTestId(`vote-count-${first}`)).toHaveTextContent('1');
    await pressAndConfirm('close-ballot');
    expect(await screen.findByTestId('ballot-result')).toBeTruthy();
    await pressAndConfirm('confirm-ballot');
    await waitFor(() => expect(useGameStore.getState().state?.mayorId).toBe(first));
    expect(await screen.findByTestId('ballot-done')).toBeTruthy();

    // Vote d'élimination : ajout, annulation de la dernière opération, clôture
    await tap('goto-elimination');
    await tap('open-ballot');
    const target = alive[1].id;
    await fireEvent.press(await screen.findByTestId(`vote-tap-${target}`));
    await fireEvent.press(screen.getByTestId(`vote-plus-${target}`));
    expect(screen.getByTestId('stat-cast')).toHaveTextContent('2');
    await fireEvent.press(screen.getByTestId('undo-vote-op'));
    await waitFor(() => expect(screen.getByTestId('stat-cast')).toHaveTextContent('1'));
    expect(screen.getByTestId('leader-text')).toHaveTextContent(/En tête/);
    await pressAndConfirm('close-ballot');
    await pressAndConfirm('confirm-ballot');
    await resolveDecisions();
    const st = useGameStore.getState().state!;
    const p = st.players.find((x) => x.id === target)!;
    expect(!p.alive || p.idiotRevealed).toBe(true);

    await act(async () => {
      await useGameStore.getState().flush();
    });
    expect(useGameStore.getState().save.status).toBe('saved');
    const expected = JSON.stringify(useGameStore.getState().state);
    const actions = useGameStore.getState().record!.actions.length;

    // Redémarrage simulé : stores vidés, réouverture depuis la base.
    await act(async () => {
      await useGameStore.getState().close();
    });
    const row = await db.first<{ action_count: number }>('SELECT action_count FROM games WHERE id = ?', [gameId]);
    expect(row?.action_count).toBe(actions);
    await act(async () => {
      expect(await useGameStore.getState().open(gameId)).toBe(true);
    });
    expect(useGameStore.getState().record?.actions.length).toBe(actions);
    expect(JSON.stringify(useGameStore.getState().state)).toBe(expected);
    expect(useAppStore.getState().games[0]?.id).toBe(gameId);
  }, 90000);
});
