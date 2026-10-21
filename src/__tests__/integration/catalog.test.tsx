import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { getRepository } from '@/state/services';
import { useAppStore } from '@/state/app-store';
import { renderApp, resetApp } from './setup';

jest.spyOn(process, 'emitWarning').mockImplementation(() => undefined);
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));
jest.mock('@/audio/expo-backend', () => ({ expoAudioBackend: jest.requireActual('./mocks').fakeAudioBackend }));

beforeEach(async () => {
  await resetApp();
});

describe('catalogue et rôles personnalisés', () => {
  it('recherche un rôle, ouvre sa fiche, puis crée un rôle personnalisé validé', async () => {
    await renderApp('/roles');
    await fireEvent.changeText(await screen.findByTestId('role-search'), 'sorci');
    await waitFor(() => expect(screen.queryByTestId('catalog-voyante')).toBeNull());
    await fireEvent.press(await screen.findByTestId('catalog-sorciere'));
    expect(await screen.findByText('Sources')).toBeTruthy();
    expect(screen.getByText(/Règle officielle confirmée/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('toggle-favorite'));
    await waitFor(() => expect(useAppStore.getState().settings.favoriteRoles).toEqual(['sorciere']));
  });

  it('crée un rôle personnalisé et refuse un nom déjà pris', async () => {
    await renderApp('/roles/custom');
    await fireEvent.changeText(await screen.findByTestId('role-name'), 'Garde du corps');
    await fireEvent.press(screen.getByTestId('role-action-protect'));
    await fireEvent.press(screen.getByTestId('save-role'));
    await waitFor(() => expect(useAppStore.getState().customRoles.map((r) => r.id)).toEqual(['custom:garde-du-corps']));
    const saved = await (await getRepository()).listCustomRoles();
    expect(saved[0]).toMatchObject({ name: 'Garde du corps', nightAction: 'protect', team: 'village' });
  });
});
