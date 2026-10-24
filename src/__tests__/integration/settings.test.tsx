import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { getRepository } from '@/state/services';
import { useAppStore } from '@/state/app-store';
import type { SqlDriver } from '@/storage/driver';
import { eventually, renderApp, resetApp } from './setup';

jest.spyOn(process, 'emitWarning').mockImplementation(() => undefined);
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));
jest.mock('@/audio/expo-backend', () => ({ expoAudioBackend: jest.requireActual('./mocks').fakeAudioBackend }));

let db: SqlDriver;
beforeEach(async () => {
  db = await resetApp();
});

describe('paramètres', () => {
  it('change le thème et le volume et les enregistre ; un échec d’écriture est annulé et signalé', async () => {
    await renderApp('/settings');
    await fireEvent.press(await screen.findByTestId('theme-foret'));
    // Au doigt : bouton − (masqué aux lecteurs d'écran, toujours touchable).
    await fireEvent.press(screen.getByTestId('vol-effects-minus', { includeHiddenElements: true }));
    await eventually(async () => {
      const saved = await (await getRepository()).getSetting<{ themeId: string; effectsVolume: number }>('app-settings');
      expect(saved).toMatchObject({ themeId: 'foret', effectsVolume: 0.6 });
    });
    // Avec VoiceOver : un seul élément « ajustable », valeur annoncée, balayage vers le bas.
    const adjust = screen.getByTestId('vol-effects-adjust');
    expect(adjust.props.accessibilityValue).toMatchObject({ now: 60, text: '60 %' });
    await fireEvent(adjust, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    await eventually(async () => {
      const saved = await (await getRepository()).getSetting<{ effectsVolume: number }>('app-settings');
      expect(saved?.effectsVolume).toBe(0.5);
    });
    const originalRun = db.run;
    db.run = async () => {
      throw new Error('écriture impossible');
    };
    await fireEvent.press(screen.getByTestId('theme-lune-de-sang'));
    await waitFor(() => expect(useAppStore.getState().settingsError).toMatch(/écriture impossible/));
    expect(useAppStore.getState().settings.themeId).toBe('foret');
    expect(await screen.findByText(/Dernier enregistrement échoué/)).toBeTruthy();
    db.run = originalRun;
    await fireEvent.press(screen.getByTestId('discreet-toggle'));
    await waitFor(() => expect(useAppStore.getState().settings.discreetMode).toBe(true));
  });
});
