import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useAppStore } from '@/state/app-store';

export interface HapticsApi {
  tap(): void;
  success(): void;
  warning(): void;
}

function run(fn: () => Promise<void>): void {
  if (Platform.OS === 'web') return;
  fn().catch(() => undefined);
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
