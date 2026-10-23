import { StyleSheet, View } from 'react-native';
import { TEAM_LABELS, type RoleDefinition, type Team } from '@/engine';
import { useTheme } from '@/theme/theme-context';
import { spacing, teamColor } from '@/theme/themes';
import { RoleArt } from './role-art';
import { AppText } from './text';

/** Carte de rôle révélée à un joueur : illustration, nom, camp, pouvoir. */
export function RoleRevealCard({ role, team, note, artWidth = 200 }: { role: RoleDefinition; team: Team; note?: string | null; artWidth?: number }) {
  const { colors } = useTheme();
  const changed = team !== role.team;
  return (
    <View style={styles.root} testID="role-reveal-card" accessible accessibilityLabel={`Ton rôle : ${role.name}. Camp : ${TEAM_LABELS[team]}. ${role.summary}`}>
      <RoleArt roleId={role.id} team={team === 'wolves' ? 'wolves' : role.team} width={artWidth} />
      <AppText variant="overline" tone="muted" align="center">
        Ton rôle
      </AppText>
      <AppText variant="display" align="center" testID="revealed-role-name">
        {role.name}
      </AppText>
      <AppText variant="bodyStrong" align="center" color={teamColor(colors, team)}>
        {`Camp : ${TEAM_LABELS[team]}${changed ? ' (tu as changé de camp)' : ''}`}
      </AppText>
      <AppText variant="small" tone="muted" align="center">
        {role.summary}
      </AppText>
      {note ? (
        <AppText variant="small" tone="accent" align="center">
          {note}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: spacing.sm },
});
