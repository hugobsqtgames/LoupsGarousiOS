import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useAppStore } from '@/state/app-store';

export interface HapticsApi {
  tap(): void;
  success(): void;
  warning(): void;
}

/** Le retour haptique est accessoire : une erreur ne doit jamais empêcher l'action demandée. */
function run(fn: () => Promise<void> | undefined): void {
  if (Platform.OS === 'web') return;
  try {
    const p = fn();
    if (p && typeof p.catch === 'function') p.catch(() => undefined);
  } catch {
    // ignoré volontairement
  }
}

/** Retour haptique, respectant le réglage utilisateur et le mode discret. */
export function useHaptics(): HapticsApi {
  const enabled = useAppStore((s) => s.settings.haptics);
  return useMemo(
    () =>
      enabled
        ? {
            tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
            success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
            warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
          }
        : { tap: () => undefined, success: () => undefined, warning: () => undefined },
    [enabled],
  );
}
