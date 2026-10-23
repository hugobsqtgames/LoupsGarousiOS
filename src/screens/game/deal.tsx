import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { phaseLabel, type PlayerState } from '@/engine';
import { Button } from '@/components/button';
import { Panel } from '@/components/panel';
import { PrivateReveal } from '@/components/private-reveal';
import { RoleRevealCard } from '@/components/role-card';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useGameState } from '@/hooks/use-game';
import { useRoleRegistry } from '@/hooks/use-roles';
import { useTheme } from '@/theme/theme-context';
import { spacing } from '@/theme/themes';
import { toDashboard } from '@/utils/nav';

/** Conseil affiché avec la carte, sans jamais révéler l'identité d'autres joueurs. */
function noteFor(p: PlayerState, firstNight: boolean): string | null {
  if (p.roleId === 'voleur' && firstNight) return 'Cette nuit, le MJ te passera le téléphone pour découvrir les deux cartes du centre : tu pourras en prendre une.';
  if (p.roleId === 'comedien') return 'Chaque nuit, le MJ te proposera les cartes mises de côté.';
  if (p.roleId === 'loup-garou' || p.team === 'wolves') return 'Tu découvriras tes complices au réveil des loups.';
  return null;
}

/**
 * Distribution des rôles sur le téléphone : chaque joueur, dans l'ordre des
 * places, découvre son rôle sur un écran privé puis le cache. Avec `pid`,
 * un seul joueur revoit son rôle actuel (après le Voleur, une infection…).
 */
export function DealScreen() {
  const state = useGameState();
  const { pid } = useLocalSearchParams<{ pid?: string }>();
  const { registry } = useRoleRegistry();
  const { colors } = useTheme();
  const single = pid ? state.players.find((p) => p.id === pid) : undefined;
  const queue = single ? [single] : [...state.players].sort((a, b) => a.seat - b.seat).filter((p) => p.alive);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const current = queue[index];
  const done = index >= queue.length;
  const firstNight = state.nightNumber <= 1 && state.phase.kind === 'night' && state.actionCount === 0;

  return (
    <Screen overline={phaseLabel(state.phase)} title={single ? 'Revoir un rôle' : 'Distribution des rôles'} back={() => toDashboard(state.setup.id)} testID="deal-screen">
      {!done ? (
        <Panel tone="accent" testID="deal-next">
          <AppText variant="overline" tone="accent">
            {single ? 'Joueur' : `Joueur ${index + 1} sur ${queue.length}`}
          </AppText>
          <AppText variant="title">{current.name}</AppText>
          <AppText variant="small" tone="muted">
            Donne le téléphone à ce joueur. Il maintiendra l’appui pour voir son rôle, puis le cachera avant de te le rendre.
          </AppText>
          <Button label={`Passer le téléphone à ${current.name}`} icon="phone" size="lg" onPress={() => setOpen(true)} testID="deal-open" />
          {!single ? <Button label="Passer ce joueur" variant="quiet" size="sm" onPress={() => setIndex((i) => i + 1)} testID="deal-skip" /> : null}
        </Panel>
      ) : (
        <Panel tone="accent" testID="deal-finished">
          <AppText variant="title">{single ? 'Rôle caché' : 'Tout le monde connaît son rôle'}</AppText>
          <AppText variant="small" tone="muted">
            Rends le téléphone au MJ. Les rôles restent consultables par le MJ (appui long) et chaque joueur peut revoir le sien depuis le tableau de bord.
          </AppText>
          <Button label="Retour au tableau de bord" icon="home" onPress={() => toDashboard(state.setup.id)} testID="deal-back" />
        </Panel>
      )}
      {!single ? (
        <Panel padded={false}>
          {queue.map((p, i) => (
            <View key={p.id} style={[styles.row, { borderBottomColor: colors.border }]}>
              <AppText variant="body" style={styles.flex}>
                {p.name}
              </AppText>
              <AppText variant="caption" tone={i < index ? 'success' : i === index ? 'accent' : 'faint'}>
                {i < index ? 'Rôle vu' : i === index ? 'À son tour' : 'En attente'}
              </AppText>
            </View>
          ))}
        </Panel>
      ) : null}
      {current ? (
        <PrivateReveal
          visible={open}
          playerName={current.name}
          onDone={() => {
            setOpen(false);
            setIndex((i) => i + 1);
          }}
          testID="deal-reveal"
        >
          <RoleRevealCard role={registry.get(current.roleId)} team={current.team} note={noteFor(current, firstNight)} />
        </PrivateReveal>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
});
