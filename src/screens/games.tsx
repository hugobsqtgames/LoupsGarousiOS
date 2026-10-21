import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WINNER_LABELS } from '@/engine';
import { Button, IconButton } from '@/components/button';
import { Segmented } from '@/components/controls';
import { useFeedback } from '@/components/feedback';
import { EmptyState } from '@/components/game-ui';
import { Chip, Panel } from '@/components/panel';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useAppStore } from '@/state/app-store';
import { useTheme } from '@/theme/theme-context';
import { spacing } from '@/theme/themes';
import { formatDate } from '@/utils/format';

export function GamesScreen() {
  const games = useAppStore((s) => s.games);
  const refresh = useAppStore((s) => s.refreshGames);
  const deleteGame = useAppStore((s) => s.deleteGame);
  const { confirm, toast } = useFeedback();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<'all' | 'active' | 'ended'>('all');

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const list = games.filter((g) => filter === 'all' || g.status === filter);
  return (
    <Screen title="Parties" overline={`${games.length} partie(s) enregistrée(s)`} back>
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'Toutes' },
          { value: 'active', label: 'En cours' },
          { value: 'ended', label: 'Terminées' },
        ]}
        testID="games-filter"
      />
      {list.length === 0 ? (
        <EmptyState icon="history" title="Aucune partie" message="Les parties créées apparaîtront ici, enregistrées sur cet appareil.">
          <Button label="Nouvelle partie" icon="plus" onPress={() => router.push('/new')} />
        </EmptyState>
      ) : (
        list.map((g) => (
          <Panel key={g.id} onPress={() => router.push({ pathname: '/game/[id]', params: { id: g.id } })} testID={`game-${g.id}`} accessibilityLabel={`Ouvrir ${g.name}`}>
            <View style={styles.head}>
              <View style={styles.flex}>
                <AppText variant="heading" numberOfLines={1}>
                  {g.name}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {formatDate(g.updatedAt)} · {g.playerCount} joueurs
                </AppText>
              </View>
              <IconButton
                icon="trash"
                label={`Supprimer ${g.name}`}
                tone="danger"
                onPress={async () => {
                  if (await confirm({ title: 'Supprimer cette partie ?', message: `« ${g.name} » et son historique seront définitivement effacés de cet appareil.`, confirmLabel: 'Supprimer', destructive: true })) {
                    try {
                      await deleteGame(g.id);
                      toast('Partie supprimée');
                    } catch (e) {
                      toast(`Échec de la suppression : ${(e as Error).message}`, 'error');
                    }
                  }
                }}
                testID={`delete-${g.id}`}
              />
            </View>
            <View style={styles.row}>
              {g.status === 'ended' ? <Chip label={g.winner ? `Victoire : ${WINNER_LABELS[g.winner]}` : 'Terminée'} color={colors.accent} /> : <Chip label={g.phaseLabel} color={colors.info} />}
              <AppText variant="caption" tone="faint">
                {g.aliveCount} survivant(s) · {g.nights} nuit(s)
              </AppText>
            </View>
          </Panel>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
});
