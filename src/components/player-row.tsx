import { Pressable, StyleSheet, View } from 'react-native';
import { DEATH_CAUSE_LABELS, loverOf, type GameState, type PlayerState } from '@/engine';
import { useRoleRegistry } from '@/hooks/use-roles';
import { useTheme } from '@/theme/theme-context';
import { spacing, teamColor } from '@/theme/themes';
import { PlayerAvatar, SecretText } from './game-ui';
import { Icon } from './icon';
import { Chip } from './panel';
import { AppText } from './text';

/** Statuts visibles d'un joueur (pour la vue d'ensemble). */
export function playerBadges(state: GameState, p: PlayerState, hideSecrets: boolean): { label: string; color: 'accent' | 'wolves' | 'solo' | 'muted' | 'warning' }[] {
  const out: { label: string; color: 'accent' | 'wolves' | 'solo' | 'muted' | 'warning' }[] = [];
  if (state.mayorId === p.id) out.push({ label: 'Maire', color: 'accent' });
  if (p.idiotRevealed) out.push({ label: 'Idiot révélé · ne vote plus', color: 'muted' });
  if (!hideSecrets) {
    if (loverOf(state, p.id)) out.push({ label: 'Amoureux', color: 'wolves' });
    if (p.charmed) out.push({ label: 'Charmé', color: 'solo' });
    if (p.infected) out.push({ label: 'Infecté', color: 'wolves' });
    if (p.transformed && !p.infected) out.push({ label: 'Devenu loup', color: 'wolves' });
    if (state.ravenMark?.targetId === p.id && state.ravenMark.day === (state.phase.kind === 'day' ? state.phase.number : state.dayNumber + 1)) out.push({ label: 'Marqué par le Corbeau', color: 'warning' });
  }
  return out;
}

export function PlayerRow({ state, player, hideSecrets, onPress, testID }: { state: GameState; player: PlayerState; hideSecrets: boolean; onPress?: () => void; testID?: string }) {
  const { colors } = useTheme();
  const { registry } = useRoleRegistry();
  const role = registry.has(player.roleId) ? registry.get(player.roleId) : null;
  const badges = playerBadges(state, player, hideSecrets);
  const tone = (c: string) => (c === 'accent' ? colors.accent : c === 'wolves' ? colors.wolves : c === 'solo' ? colors.solo : c === 'warning' ? colors.warning : colors.textMuted);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${player.name}${player.alive ? '' : ', éliminé'}${hideSecrets ? '' : `, ${role?.name ?? ''}`}`}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: player.alive ? 1 : 0.62 }, pressed && { backgroundColor: colors.surfacePressed }]}
      testID={testID}
    >
      <PlayerAvatar name={player.name} alive={player.alive} mayor={state.mayorId === player.id} team={hideSecrets ? null : player.team} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={1} style={!player.alive ? styles.dead : undefined}>
          {player.name}
        </AppText>
        {player.alive ? (
          <SecretText text={role?.name ?? player.roleId} hidden={hideSecrets} tone={teamColor(colors, player.team)} onPress={onPress} />
        ) : (
          <AppText variant="caption" tone="faint" numberOfLines={1}>
            {player.death ? `${DEATH_CAUSE_LABELS[player.death.cause]} · ${player.death.phaseLabel}` : 'Éliminé(e)'}
            {hideSecrets ? '' : ` · ${role?.name ?? ''}`}
          </AppText>
        )}
        {badges.length ? (
          <View style={styles.badges}>
            {badges.map((b) => (
              <Chip key={b.label} label={b.label} color={tone(b.color)} />
            ))}
          </View>
        ) : null}
      </View>
      {onPress ? <Icon name="chevron-right" color={colors.textFaint} size={18} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1, gap: 2 },
  dead: { textDecorationLine: 'line-through' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
});
