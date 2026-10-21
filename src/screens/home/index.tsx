import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Chip, Panel, SectionTitle } from '@/components/panel';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useAppStore } from '@/state/app-store';
import { useTheme } from '@/theme/theme-context';
import { radius, spacing } from '@/theme/themes';
import { formatDate } from '@/utils/format';

function Tile({ icon, title, subtitle, onPress, testID }: { icon: IconName; title: string; subtitle: string; onPress: () => void; testID: string }) {
  const { colors } = useTheme();
  return (
    <Panel onPress={onPress} style={styles.tile} testID={testID} accessibilityLabel={`${title}. ${subtitle}`}>
      <View style={[styles.tileIcon, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
        <Icon name={icon} color={colors.accent} size={22} />
      </View>
      <View style={styles.gap2}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" tone="muted" numberOfLines={2}>
          {subtitle}
        </AppText>
      </View>
    </Panel>
  );
}

export function HomeScreen() {
  const games = useAppStore((s) => s.games);
  const compositions = useAppStore((s) => s.compositions);
  const { colors } = useTheme();
  const active = games.filter((g) => g.status === 'active');
  const latest = active[0];
  const ended = games.filter((g) => g.status === 'ended').length;

  return (
    <Screen
      overline="Carnet du maître du jeu"
      title="Loups-Garous"
      subtitle="Préparez la nuit, guidez le village, tranchez les votes."
      right={<IconButton icon="settings" label="Paramètres" onPress={() => router.push('/settings')} testID="home-settings" />}
    >
      {latest ? (
        <Panel tone="accent" overline="Partie en cours" title={latest.name} testID="resume-card">
          <View style={styles.row}>
            <Chip label={latest.phaseLabel} color={colors.accent} />
            <AppText variant="small" tone="muted">
              {latest.aliveCount} / {latest.playerCount} en vie · {formatDate(latest.updatedAt)}
            </AppText>
          </View>
          <Button label="Reprendre la partie" icon="play" onPress={() => router.push({ pathname: '/game/[id]', params: { id: latest.id } })} testID="resume-game" />
          {active.length > 1 ? (
            <Button label={`Voir les ${active.length} parties en cours`} variant="ghost" size="sm" onPress={() => router.push('/games')} />
          ) : null}
        </Panel>
      ) : null}

      <Button label="Nouvelle partie" icon="plus" size="lg" variant={latest ? 'secondary' : 'primary'} onPress={() => router.push('/new')} testID="new-game" />

      {compositions.length > 0 ? (
        <>
          <SectionTitle>Compositions favorites</SectionTitle>
          {compositions.slice(0, 4).map((c) => (
            <Panel
              key={c.id}
              onPress={() => router.push({ pathname: '/new', params: { composition: c.id } })}
              testID={`favorite-${c.id}`}
              style={styles.favorite}
              accessibilityLabel={`Lancer la composition ${c.name}`}
            >
              <Icon name="favorite" color={colors.accent} size={20} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{c.name}</AppText>
                <AppText variant="caption" tone="muted">
                  {c.roles.length} joueurs
                </AppText>
              </View>
              <Icon name="chevron-right" color={colors.textFaint} size={18} />
            </Panel>
          ))}
        </>
      ) : null}

      <SectionTitle>Le grimoire</SectionTitle>
      <View style={styles.grid}>
        <Tile icon="history" title="Parties" subtitle={ended ? `${ended} terminée(s), ${active.length} en cours` : 'Historique des parties'} onPress={() => router.push('/games')} testID="tile-games" />
        <Tile icon="book" title="Rôles" subtitle="Catalogue et rôles personnalisés" onPress={() => router.push('/roles')} testID="tile-roles" />
        <Tile icon="chart" title="Statistiques" subtitle="Camps gagnants, rôles joués" onPress={() => router.push('/stats')} testID="tile-stats" />
        <Tile icon="help" title="Aide" subtitle="Déroulement et fonctions" onPress={() => router.push('/help')} testID="tile-help" />
      </View>
      <AppText variant="caption" tone="faint" align="center" style={styles.footnote}>
        Fonctionne entièrement hors ligne · Aucune donnée ne quitte cet appareil
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap2: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { flexBasis: '47%', flexGrow: 1, minHeight: 128 },
  tileIcon: { width: 42, height: 42, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  favorite: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  footnote: { marginTop: spacing.xl },
});
