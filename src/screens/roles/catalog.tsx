import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { EXPANSION_LABELS, TEAM_LABELS, type Expansion, type Team } from '@/engine';
import { Button, IconButton } from '@/components/button';
import { Segmented, TextField } from '@/components/controls';
import { EmptyState, RoleMedallion } from '@/components/game-ui';
import { Icon } from '@/components/icon';
import { Panel } from '@/components/panel';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useRoleRegistry } from '@/hooks/use-roles';
import { useAppStore } from '@/state/app-store';
import { useTheme } from '@/theme/theme-context';
import { spacing, teamColor } from '@/theme/themes';

function fold(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function RoleCatalogScreen() {
  const { all } = useRoleRegistry();
  const favorites = useAppStore((s) => s.settings.favoriteRoles);
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [team, setTeam] = useState<Team | 'all'>('all');
  const [expansion, setExpansion] = useState<Expansion | 'all' | 'fav'>('all');
  const list = useMemo(
    () =>
      all.filter(
        (r) =>
          (team === 'all' || r.team === team) &&
          (expansion === 'all' || (expansion === 'fav' ? favorites.includes(r.id) : r.expansion === expansion)) &&
          (!query || fold(`${r.name} ${r.summary}`).includes(fold(query))),
      ),
    [all, team, expansion, query, favorites],
  );
  return (
    <Screen
      title="Rôles"
      overline={`${all.length} rôles dans le grimoire`}
      back
      right={<IconButton icon="plus" label="Créer un rôle personnalisé" onPress={() => router.push('/roles/custom')} tone="accent" testID="create-role" />}
    >
      <TextField placeholder="Rechercher un rôle…" value={query} onChangeText={setQuery} autoCorrect={false} testID="role-search" />
      <Segmented<Team | 'all'>
        value={team}
        onChange={setTeam}
        options={[
          { value: 'all', label: 'Tous' },
          { value: 'village', label: 'Village' },
          { value: 'wolves', label: 'Loups' },
          { value: 'solo', label: 'Solitaires' },
        ]}
        testID="team-filter"
      />
      <Segmented<Expansion | 'all' | 'fav'>
        value={expansion}
        onChange={setExpansion}
        options={[
          { value: 'all', label: 'Tout' },
          { value: 'base', label: 'Base' },
          { value: 'nouvelle-lune', label: 'Lune' },
          { value: 'personnages', label: 'Perso' },
          { value: 'custom', label: 'Créés' },
          { value: 'fav', label: 'Fav.' },
        ]}
        testID="expansion-filter"
      />
      {list.length === 0 ? (
        <EmptyState icon="search" title="Aucun rôle" message={expansion === 'custom' ? 'Créez votre premier rôle personnalisé.' : 'Aucun rôle ne correspond à ces filtres.'}>
          {expansion === 'custom' ? <Button label="Créer un rôle" icon="plus" onPress={() => router.push('/roles/custom')} /> : null}
        </EmptyState>
      ) : (
        <Panel padded={false}>
          {list.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => router.push({ pathname: '/roles/[id]', params: { id: r.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${r.name}, ${TEAM_LABELS[r.team]}`}
              style={({ pressed }) => [styles.row, { borderBottomColor: colors.border }, pressed && { backgroundColor: colors.surfacePressed }]}
              testID={`catalog-${r.id}`}
            >
              <RoleMedallion role={r} size={44} />
              <View style={styles.flex}>
                <View style={styles.inline}>
                  <AppText variant="bodyStrong" style={styles.shrink}>
                    {r.name}
                  </AppText>
                  {favorites.includes(r.id) ? <Icon name="favorite" color={colors.accent} size={14} /> : null}
                </View>
                <AppText variant="caption" color={teamColor(colors, r.team)}>
                  {TEAM_LABELS[r.team]} · {EXPANSION_LABELS[r.expansion]}
                </AppText>
                <AppText variant="small" tone="muted" numberOfLines={2}>
                  {r.summary}
                </AppText>
              </View>
              <Icon name="chevron-right" color={colors.textFaint} size={18} />
            </Pressable>
          ))}
        </Panel>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  shrink: { flexShrink: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
});
