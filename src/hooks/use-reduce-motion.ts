import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useAppStore } from '@/state/app-store';

/** Animations réduites : réglage de l'appareil (« Réduire les animations ») ou de l'application. */
export function useReduceMotion(): boolean {
  const setting = useAppStore((s) => s.settings.reduceMotion || s.settings.discreetMode);
  const [system, setSystem] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setSystem(v);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystem);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return setting || system;
}
