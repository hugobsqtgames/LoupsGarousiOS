import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import type { AudioBackend, PlayerLike } from './audio-manager';

/** Backend réel : expo-audio pour les sons, expo-speech (voix de l'appareil, hors ligne) pour la narration. */
export const expoAudioBackend: AudioBackend = {
  createPlayer(source) {
    return createAudioPlayer(source as number) as unknown as PlayerLike;
  },
  setMode({ playsInSilentMode }) {
    return setAudioModeAsync({ playsInSilentMode, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false });
  },
  speak(text, volume) {
    Speech.speak(text, { language: 'fr-FR', volume, rate: 0.92 });
  },
  stopSpeech() {
    void Speech.stop();
  },
};
