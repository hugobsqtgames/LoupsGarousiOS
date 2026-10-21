import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useAppStore } from '@/state/app-store';
import { AudioManager, type AudioBackend, type Scene } from './audio-manager';
import { AMBIENTS, EFFECTS, type EffectName } from './sounds';

export interface AudioApi {
  setScene(scene: Scene): void;
  play(effect: EffectName): void;
  narrate(text: string): void;
  lastError(): string | null;
}

const noop: AudioApi = { setScene: () => undefined, play: () => undefined, narrate: () => undefined, lastError: () => null };
const AudioContext = createContext<AudioApi>(noop);

export function AudioProvider({ backend, children }: { backend: AudioBackend | null; children: ReactNode }) {
  const settings = useAppStore((s) => s.settings);
  const managerRef = useRef<AudioManager | null>(null);
  const prefs = useMemo(
    () => ({
      muted: settings.muted,
      discreet: settings.discreetMode,
      ambientVolume: settings.ambientVolume,
      effectsVolume: settings.effectsVolume,
      narrationEnabled: settings.narrationEnabled,
      narrationVolume: settings.narrationVolume,
      playInSilentMode: settings.playInSilentMode,
    }),
    [settings.muted, settings.discreetMode, settings.ambientVolume, settings.effectsVolume, settings.narrationEnabled, settings.narrationVolume, settings.playInSilentMode],
  );
  const prefsRef = useRef(prefs);

  useEffect(() => {
    prefsRef.current = prefs;
    managerRef.current?.updatePrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    if (!backend) return;
    const m = new AudioManager(backend, { ambients: AMBIENTS, effects: EFFECTS }, prefsRef.current);
    managerRef.current = m;
    const sub = AppState.addEventListener('change', (s) => m.setBackgrounded(s !== 'active'));
    return () => {
      sub.remove();
      m.dispose();
      managerRef.current = null;
    };
  }, [backend]);

  const api = useMemo<AudioApi>(
    () => ({
      setScene: (scene) => managerRef.current?.setScene(scene),
      play: (effect) => managerRef.current?.playEffect(effect),
      narrate: (text) => managerRef.current?.narrate(text),
      lastError: () => managerRef.current?.lastError ?? null,
    }),
    [],
  );
  return <AudioContext.Provider value={api}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioApi {
  return useContext(AudioContext);
}
