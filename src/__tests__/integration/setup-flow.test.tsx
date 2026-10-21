import { screen } from 'expo-router/testing-library';
import { useDraftStore } from '@/state/draft-store';
import { addPlayers, renderApp, resetApp } from './setup';

jest.spyOn(process, 'emitWarning').mockImplementation(() => undefined);
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));
jest.mock('@/audio/expo-backend', () => ({ expoAudioBackend: jest.requireActual('./mocks').fakeAudioBackend }));

beforeEach(async () => {
  await resetApp();
});

describe('création de partie', () => {
  it('ajoute des joueurs, refuse les doublons et bloque sous 5 joueurs', async () => {
    await renderApp('/new');
    await addPlayers(['Alice', 'Bruno']);
    expect(useDraftStore.getState().draft.players.map((p) => p.name)).toEqual(['Alice', 'Bruno']);
    await addPlayers(['alice']);
    expect(await screen.findByText(/déjà dans la liste/)).toBeTruthy();
    expect(useDraftStore.getState().draft.players).toHaveLength(2);
    expect(screen.getByTestId('step-blocker')).toHaveTextContent('Ajoutez au moins 5 joueurs.');
  });
});
