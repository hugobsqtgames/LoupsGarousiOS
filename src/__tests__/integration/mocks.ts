/** Modules natifs remplacés pendant les tests d'intégration (importé via jest.mock dans chaque fichier). */
export const fakeAudioBackend = {
  played: [] as string[],
  createPlayer(source: unknown) {
    return { play: () => fakeAudioBackend.played.push(String(source)), pause: () => undefined, seekTo: async () => undefined, volume: 1, loop: false, remove: () => undefined };
  },
  setMode: async () => undefined,
  speak: () => undefined,
  stopSpeech: () => undefined,
};
