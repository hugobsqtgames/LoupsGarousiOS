import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { describeAction, describeEntry, phaseLabel, ReplayCursor, roleName } from '@/engine';
import { Button, IconButton } from '@/components/button';
import { PlayerAvatar } from '@/components/game-ui';
import { Panel, SectionTitle } from '@/components/panel';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useGameState } from '@/hooks/use-game';
import { useAppStore } from '@/state/app-store';
import { useGameStore } from '@/state/game-store';
import { useTheme } from '@/theme/theme-context';
import { radius, spacing } from '@/theme/themes';
import { toDashboard } from '@/utils/nav';

/** Rejeu « magnétoscope » : action par action, en recalculant l'état avec le moteur. */
export function ReplayScreen() {
  const live = useGameState();
  const record = useGameStore((s) => s.record)!;
  const hide = useGameStore((s) => s.hideSecrets);
  const setHide = useGameStore((s) => s.setHideSecrets);
  const reduceMotion = useAppStore((s) => s.settings.reduceMotion);
  const { colors } = useTheme();
  const cursor = useMemo(() => new ReplayCursor(record), [record]);
  const starts = useMemo(() => cursor.phaseStarts(), [cursor]);
  const [k, setK] = useState(0);
  const [playing, setPlaying] = useState(false);
  const n = cursor.length;
  const state = cursor.stateAt(k);
  const before = k > 0 ? cursor.stateAt(k - 1) : null;
  const action = k > 0 ? record.actions[k - 1].action : null;
  const produced = before ? state.log.slice(before.log.length) : [];

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setK((x) => (x >= n ? x : x + 1)), reduceMotion ? 1600 : 900);
    return () => clearInterval(id);
  }, [playing, n, reduceMotion]);

  const go = (to: number) => {
    setPlaying(false);
    setK(Math.max(0, Math.min(n, to)));
  };
  const prevPhase = [...starts].reverse().find((s) => s < k) ?? 0;
  const nextPhase = starts.find((s) => s > k) ?? n;
  const atEnd = k >= n;

  return (
    <Screen
      overline={`Rejeu · ${live.setup.name}`}
      title={phaseLabel(state.phase)}
      back={() => toDashboard(live.setup.id)}
      right={<IconButton icon={hide ? 'eye-off' : 'eye'} label={hide ? 'Afficher les secrets' : 'Masquer les secrets'} onPress={() => setHide(!hide)} active={!hide} testID="replay-secrets" />}
      footer={
        <View style={styles.controls}>
          <IconButton icon="chevron-left" label="Phase précédente" onPress={() => go(prevPhase)} disabled={k === 0} testID="replay-prev-phase" />
          <Button label="−1" size="sm" variant="secondary" onPress={() => go(k - 1)} disabled={k === 0} style={styles.flex} testID="replay-back" />
          <Button label={playing ? 'Pause' : atEnd ? 'Revoir' : 'Lecture'} icon={playing ? 'pause' : 'play'} size="sm" onPress={() => (atEnd ? go(0) : setPlaying((p) => !p))} style={styles.flex} testID="replay-play" />
          <Button label="+1" size="sm" variant="secondary" onPress={() => go(k + 1)} disabled={atEnd} style={styles.flex} testID="replay-forward" />
          <IconButton icon="chevron-right" label="Phase suivante" onPress={() => go(nextPhase)} disabled={atEnd} testID="replay-next-phase" />
        </View>
      }
      testID="replay-screen"
    >
      <View style={[styles.track, { backgroundColor: colors.surfacePressed }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: n, now: k }}>
        <View style={[styles.fill, { width: `${n ? (k / n) * 100 : 0}%`, backgroundColor: colors.accent }]} />
      </View>
      <AppText variant="caption" tone="muted" testID="replay-position">
        Action {k} sur {n}
      </AppText>
      <Panel tone="accent" overline={action ? `Action ${k}` : 'Début de la partie'} testID="replay-action">
        <AppText variant="heading">{action && before ? describeAction(before, action) : 'Distribution des rôles'}</AppText>
        {produced
          .filter((e) => e.event.type !== 'vote' && (!hide || !e.secret))
          .map((e) => (
            <AppText key={e.seq} variant="small" tone={e.secret ? 'faint' : 'muted'}>
              • {describeEntry(state, e, hide)}
            </AppText>
          ))}
      </Panel>
      <SectionTitle>{`Joueurs (${state.players.filter((p) => p.alive).length} en vie)`}</SectionTitle>
      <Panel padded={false}>
        {state.players.map((p) => (
          <View key={p.id} style={[styles.row, { borderBottomColor: colors.border }]}>
            <PlayerAvatar name={p.name} alive={p.alive} mayor={state.mayorId === p.id} team={hide ? null : p.team} size={36} />
            <AppText variant="body" style={styles.flex}>
              {p.name}
            </AppText>
            <AppText variant="caption" tone="muted">
              {hide ? (p.alive ? 'en vie' : 'éliminé') : roleName(state, p.roleId)}
            </AppText>
          </View>
        ))}
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});
