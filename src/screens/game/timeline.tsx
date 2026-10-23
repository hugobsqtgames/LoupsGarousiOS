import { StyleSheet, View } from 'react-native';
import { buildTimeline, phaseLabel, type TimelineItemKind } from '@/engine';
import { IconButton } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Panel } from '@/components/panel';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useGameState } from '@/hooks/use-game';
import { useGameStore } from '@/state/game-store';
import { useTheme } from '@/theme/theme-context';
import { spacing } from '@/theme/themes';
import { toDashboard } from '@/utils/nav';

const KIND_ICON: Record<TimelineItemKind, IconName> = {
  death: 'skull',
  revived: 'heart',
  vote: 'ballot',
  mayor: 'crown',
  event: 'sparkles',
  info: 'info',
  secret: 'lock',
  victory: 'flag',
};

/** Chronologie visuelle : nuits et jours, morts, votes, élections, événements. */
export function TimelineScreen() {
  const state = useGameState();
  const hide = useGameStore((s) => s.hideSecrets);
  const setHide = useGameStore((s) => s.setHideSecrets);
  const { colors } = useTheme();
  const phases = buildTimeline(state);
  const color = (k: TimelineItemKind) => (k === 'death' ? colors.danger : k === 'vote' || k === 'mayor' ? colors.accent : k === 'victory' ? colors.success : k === 'secret' ? colors.textFaint : colors.textMuted);

  return (
    <Screen
      overline={phaseLabel(state.phase)}
      title="Chronologie"
      back={() => toDashboard(state.setup.id)}
      right={<IconButton icon={hide ? 'eye-off' : 'eye'} label={hide ? 'Afficher les secrets' : 'Masquer les secrets'} onPress={() => setHide(!hide)} active={!hide} testID="timeline-secrets" />}
      testID="timeline-screen"
    >
      {phases.length === 0 ? (
        <Panel>
          <AppText tone="muted">Rien à afficher pour l’instant : la chronologie se remplit au fil de la partie.</AppText>
        </Panel>
      ) : null}
      {phases.map((ph, i) => {
        const items = ph.items.filter((it) => !hide || !it.secret);
        return (
          <View key={`${ph.label}-${i}`} style={styles.phase} accessibilityRole="summary">
            <View style={styles.rail}>
              <View style={[styles.node, { backgroundColor: ph.kind === 'night' ? colors.surfaceRaised : colors.accent, borderColor: colors.accent }]}>
                <Icon name={ph.kind === 'night' ? 'moon' : ph.kind === 'day' ? 'sun' : 'flag'} color={ph.kind === 'night' ? colors.accent : colors.onAccent} size={16} />
              </View>
              {i < phases.length - 1 ? <View style={[styles.line, { backgroundColor: colors.border }]} /> : null}
            </View>
            <View style={styles.body}>
              <AppText variant="heading" accessibilityRole="header">
                {ph.label}
              </AppText>
              {items.length === 0 ? (
                <AppText variant="small" tone="faint">
                  {hide ? 'Événements secrets masqués.' : 'Rien de notable.'}
                </AppText>
              ) : (
                items.map((it) => (
                  <View key={it.key} style={styles.item} testID={`timeline-item-${it.kind}`}>
                    <Icon name={KIND_ICON[it.kind]} color={color(it.kind)} size={16} />
                    <AppText variant="small" tone={it.secret ? 'faint' : 'default'} style={styles.flex}>
                      {it.text}
                    </AppText>
                  </View>
                ))
              )}
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  phase: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 32 },
  node: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, marginVertical: 2 },
  body: { flex: 1, gap: 6, paddingBottom: spacing.lg },
  item: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
});
