import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { DEATH_CAUSE_LABELS, describeEntry, TEAM_LABELS, WINNER_LABELS } from '@/engine';
import { Button } from '@/components/button';
import { RecapShareButton } from '@/components/recap-share';
import { PlayerAvatar, RoleMedallion } from '@/components/game-ui';
import { Chip, Panel, SectionTitle } from '@/components/panel';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useGameState } from '@/hooks/use-game';
import { useRoleRegistry } from '@/hooks/use-roles';
import { draftFromSetup } from '@/state/draft';
import { useDraftStore } from '@/state/draft-store';
import { useGameStore } from '@/state/game-store';
import { useTheme } from '@/theme/theme-context';
import { spacing, teamColor } from '@/theme/themes';
import { toDashboard, toHome } from '@/utils/nav';

const KEY_EVENTS = new Set(['death', 'mayor', 'lovers', 'transformed', 'infected', 'idiot-revealed', 'elder-vengeance', 'servant', 'victory', 'angel-now-villager']);

export function SummaryScreen() {
  const state = useGameState();
  const record = useGameStore((s) => s.record)!;
  const close = useGameStore((s) => s.close);
  const resetDraft = useDraftStore((s) => s.reset);
  const { registry } = useRoleRegistry();
  const { colors } = useTheme();
  const v = state.victory;
  const winners = new Set(v?.winners ?? []);
  const keyEvents = state.log.filter((e) => KEY_EVENTS.has(e.event.type));

  const recap = {
    title: state.setup.name,
    winnerLabel: v ? WINNER_LABELS[v.winner] : 'Partie en cours',
    reason: v?.reason ?? '',
    nights: state.nightNumber,
    days: state.dayNumber,
    date: state.setup.createdAt.slice(0, 10).split('-').reverse().join('/'),
    players: state.players.map((p) => {
      const role = registry.has(p.roleId) ? registry.get(p.roleId) : null;
      return { name: p.name, roleName: role?.name ?? p.roleId, glyph: role?.icon ?? 'custom', team: p.team, alive: p.alive, winner: winners.has(p.id) };
    }),
    moments: keyEvents.filter((e) => !['lovers', 'transformed', 'infected', 'servant'].includes(e.event.type) || state.phase.kind === 'ended').map((e) => `${e.phaseLabel} : ${describeEntry(state, e)}`),
  };

  const replaySame = async (edit: boolean) => {
    const draft = draftFromSetup(state.setup);
    resetDraft(state.setup.variants, draft);
    useDraftStore.getState().setStep(edit ? 0 : 4);
    await close();
    toHome();
    router.push('/new');
  };

  return (
    <Screen overline="Fin de partie" title={v ? WINNER_LABELS[v.winner] : 'Partie en cours'} subtitle={v?.reason} back={() => toDashboard(state.setup.id)}>
      <Panel tone="accent" testID="summary-stats">
        <View style={styles.stats}>
          <View style={styles.stat}>
            <AppText variant="number">{state.nightNumber}</AppText>
            <AppText variant="caption" tone="muted">nuits</AppText>
          </View>
          <View style={styles.stat}>
            <AppText variant="number">{state.dayNumber}</AppText>
            <AppText variant="caption" tone="muted">jours</AppText>
          </View>
          <View style={styles.stat}>
            <AppText variant="number">{state.players.filter((p) => p.alive).length}</AppText>
            <AppText variant="caption" tone="muted">survivants</AppText>
          </View>
          <View style={styles.stat}>
            <AppText variant="number">{record.actions.length}</AppText>
            <AppText variant="caption" tone="muted">actions</AppText>
          </View>
        </View>
      </Panel>

      <SectionTitle>Les rôles révélés</SectionTitle>
      <Panel padded={false}>
        {state.players.map((p) => {
          const role = registry.has(p.roleId) ? registry.get(p.roleId) : null;
          return (
            <View key={p.id} style={[styles.row, { borderBottomColor: colors.border }]}>
              <PlayerAvatar name={p.name} alive={p.alive} mayor={state.mayorId === p.id} team={p.team} size={40} />
              <View style={styles.flex}>
                <View style={styles.inline}>
                  <AppText variant="bodyStrong">{p.name}</AppText>
                  {winners.has(p.id) ? <Chip label="Gagnant" color={colors.accent} filled /> : null}
                </View>
                <AppText variant="caption" color={teamColor(colors, p.team)}>
                  {role?.name} · {TEAM_LABELS[p.team]}
                </AppText>
                {p.death ? (
                  <AppText variant="caption" tone="faint">
                    {DEATH_CAUSE_LABELS[p.death.cause]} · {p.death.phaseLabel}
                  </AppText>
                ) : null}
              </View>
              {role ? <RoleMedallion role={role} size={34} /> : null}
            </View>
          );
        })}
      </Panel>

      <SectionTitle>Moments clés</SectionTitle>
      <Panel>
        {keyEvents.map((e) => (
          <View key={e.seq} style={styles.event}>
            <AppText variant="caption" tone="faint" style={styles.phase}>
              {e.phaseLabel}
            </AppText>
            <AppText variant="small" style={styles.flex}>
              {describeEntry(state, e)}
            </AppText>
          </View>
        ))}
      </Panel>

      {state.phase.kind === 'ended' ? <RecapShareButton data={recap} fileName={`recap-${state.setup.id}.png`} /> : null}
      <Button label="Revoir la partie pas à pas" icon="replay" variant="secondary" onPress={() => router.push({ pathname: '/game/[id]/replay', params: { id: state.setup.id } })} testID="open-replay" />
      <Button label="Chronologie" icon="timeline" variant="secondary" onPress={() => router.push({ pathname: '/game/[id]/timeline', params: { id: state.setup.id } })} testID="summary-timeline" />
      <Button label="Rejouer avec la même composition" icon="refresh" onPress={() => void replaySame(false)} testID="replay-same" />
      <Button label="Modifier la configuration" icon="edit" variant="secondary" onPress={() => void replaySame(true)} testID="replay-edit" />
      <Button label="Historique complet" icon="history" variant="quiet" onPress={() => router.push({ pathname: '/game/[id]/history', params: { id: state.setup.id } })} />
      <Button
        label="Retour à l’accueil"
        icon="home"
        variant="quiet"
        onPress={async () => {
          await close();
          toHome();
        }}
        testID="summary-home"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  event: { flexDirection: 'row', gap: spacing.md, paddingVertical: 3 },
  phase: { width: 64 },
});
