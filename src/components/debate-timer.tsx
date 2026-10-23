import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAudio } from '@/audio/audio-context';
import { useTheme } from '@/theme/theme-context';
import { radius, spacing } from '@/theme/themes';
import { useHaptics } from '@/utils/haptics';
import { Button } from './button';
import { Icon } from './icon';
import { AppText } from './text';

function fmt(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Minuteur de débat (remonter le composant avec une `key` pour le remettre à zéro) : compte à rebours fondé sur l'heure de fin (précis même
 * si l'écran se met à jour irrégulièrement), alerte sonore discrète et
 * vibration à zéro, prolongation d'une minute en un geste.
 */
export function DebateTimer({ minutes, testID }: { minutes: number; testID?: string }) {
  const { colors } = useTheme();
  const audio = useAudio();
  const haptics = useHaptics();
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [paused, setPaused] = useState<number>(minutes * 60);
  const alerted = useRef(false);

  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt && !alerted.current) {
        alerted.current = true;
        audio.play('timer');
        haptics.warning();
      }
    }, 250);
    return () => clearInterval(id);
  }, [endsAt, audio, haptics]);

  const left = endsAt !== null ? (endsAt - now) / 1000 : paused;
  const running = endsAt !== null && left > 0;
  const over = endsAt !== null && left <= 0;
  const startFrom = (seconds: number) => {
    alerted.current = false;
    const t = Date.now();
    setNow(t);
    setEndsAt(t + seconds * 1000);
  };
  const pause = () => {
    setPaused(Math.max(0, left));
    setEndsAt(null);
  };
  const extend = () => {
    alerted.current = false;
    if (endsAt !== null) {
      const t = Date.now();
      setNow(t);
      setEndsAt(Math.max(endsAt, t) + 60_000);
    } else setPaused((p) => p + 60);
  };
  const shown = left;
  const ratio = Math.max(0, Math.min(1, shown / Math.max(1, minutes * 60)));

  return (
    <View style={[styles.root, { borderColor: over ? colors.danger : colors.border, backgroundColor: colors.surface }]} testID={testID}>
      <View style={styles.head}>
        <Icon name="timer" color={over ? colors.danger : colors.accent} size={20} />
        <AppText variant="bodyStrong" style={styles.flex}>
          Débat
        </AppText>
        <AppText variant="number" tone={over ? 'danger' : running ? 'accent' : 'default'} accessibilityLabel={over ? 'Temps écoulé' : `Temps restant ${fmt(shown)}`} accessibilityLiveRegion={over ? 'assertive' : 'none'} testID="timer-value">
          {over ? 'Temps écoulé' : fmt(shown)}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfacePressed }]}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: over ? colors.danger : colors.accent }]} />
      </View>
      <View style={styles.row}>
        {running ? (
          <Button label="Pause" icon="pause" size="sm" variant="secondary" onPress={pause} style={styles.flex} testID="timer-pause" />
        ) : (
          <Button label={over ? 'Relancer' : paused !== minutes * 60 ? 'Reprendre' : 'Démarrer'} icon="play" size="sm" onPress={() => startFrom(over ? minutes * 60 : paused)} style={styles.flex} testID="timer-start" />
        )}
        <Button label="+1 min" icon="plus" size="sm" variant="secondary" onPress={extend} style={styles.flex} testID="timer-extend" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  row: { flexDirection: 'row', gap: spacing.sm },
});
