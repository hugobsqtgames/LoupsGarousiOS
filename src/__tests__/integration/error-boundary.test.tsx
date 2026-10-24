import { screen } from 'expo-router/testing-library';
import { GameDriver, makeSetup } from '@/engine/testing';
import { getRepository } from '@/state/services';
import { renderApp, resetApp, tap } from './setup';

jest.spyOn(process, 'emitWarning').mockImplementation(() => undefined);
jest.spyOn(console, 'error').mockImplementation(() => undefined);
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));
jest.mock('@/audio/expo-backend', () => ({ expoAudioBackend: jest.requireActual('./mocks').fakeAudioBackend }));
// Écran volontairement défaillant : simule une erreur d'affichage imprévue.
let mockBroken = true;
jest.mock('@/screens/game/timeline', () => ({
  TimelineScreen: () => {
    if (mockBroken) throw new Error('panne simulée');
    const { Text } = jest.requireActual('react-native');
    return <Text testID="timeline-ok">ok</Text>;
  },
}));

/** Régression de l'audit QA : une erreur d'affichage n'arrête plus l'application. */
it('une erreur d’écran affiche l’écran de secours, puis « Réessayer » relance l’écran', async () => {
  await resetApp();
  const setup = { ...makeSetup(['loup-garou', 'voyante', 'villageois', 'villageois', 'villageois']), id: 'g-err', name: 'Erreur' };
  const g = new GameDriver(setup);
  await (await getRepository()).saveGame(g.record, g.state);
  await renderApp('/game/g-err/timeline');
  expect(await screen.findByTestId('error-fallback')).toBeTruthy();
  expect(screen.getByText('panne simulée')).toBeTruthy();
  mockBroken = false;
  await tap('error-retry');
  expect(await screen.findByTestId('timeline-ok')).toBeTruthy();
});
