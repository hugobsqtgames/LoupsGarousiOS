import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { WINNER_LABELS } from '@/engine';
import { EmptyState, PlayerAvatar } from '@/components/game-ui';
import { Panel, SectionTitle } from '@/components/panel';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useRoleRegistry } from '@/hooks/use-roles';
import { useAppStore } from '@/state/app-store';
import { computePlayerStats, computeStats, type PlayerStats } from '@/state/stats';
import { Sheet } from '@/components/sheet';
import { Icon } from '@/components/icon';
import { useTheme } from '@/theme/theme-context';
import { radius, spacing } from '@/theme/themes';

/** Barre horizontale étiquetée : une seule série, valeur écrite en clair. */
function BarRow({ label, value, max, suffix }: { label: string; value: number; max: number; suffix?: string }) {
  const { colors } = useTheme();
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <View style={styles.barRow} accessible accessibilityLabel={`${label} : ${value}${suffix ?? ''}`}>
      <AppText variant="small" style={styles.barLabel} numberOfLines={1}>
        {label}
      </AppText>
      <View style={[styles.track, { backgroundColor: colors.surfacePressed }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.accent }]} />
      </View>
      <AppText variant="bodyStrong" style={styles.barValue}>
        {value}
        {suffix ?? ''}
      </AppText>
    </View>
  );
}

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <Panel style={styles.tile}>
      <AppText variant="number">{value}</AppText>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </Panel>
  );
}

export function StatsScreen() {
  const games = useAppStore((s) => s.games);
  const refresh = useAppStore((s) => s.refreshGames);
  const { registry } = useRoleRegistry();
  const stats = useMemo(() => computeStats(games), [games]);
  const players = useMemo(() => computePlayerStats(games), [games]);
  const [detail, setDetail] = useState<PlayerStats | null>(null);
  const { colors } = useTheme();
  const pct = (r: number | null) => (r === null ? '—' : `${Math.round(r * 100)} %`);
  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);
  const name = (id: string) => (registry.has(id as never) ? registry.get(id as never).name : id);

  return (
    <Screen title="Statistiques" overline="Calculées sur cet appareil" back>
      {stats.total === 0 ? (
        <EmptyState icon="chart" title="Pas encore de statistiques" message="Terminez une première partie pour voir apparaître les résultats." />
      ) : (
        <>
          <View style={styles.tiles}>
            <Tile value={stats.total} label="parties" />
            <Tile value={stats.decided} label="terminées" />
            <Tile value={stats.avgNights ?? '—'} label="nuits en moyenne" />
            <Tile value={stats.avgPlayers ?? '—'} label="joueurs en moyenne" />
          </View>
          <SectionTitle>Par joueur</SectionTitle>
          <Panel padded={false} testID="stats-players">
            {players.length === 0 ? (
              <View style={styles.pad}>
                <AppText variant="small" tone="muted">
                  Les statistiques par joueur apparaissent pour les parties enregistrées avec cette version. Un joueur est reconnu par son nom.
                </AppText>
              </View>
            ) : (
              players.slice(0, 40).map((p) => (
                <Pressable
                  key={p.key}
                  onPress={() => setDetail(p)}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.name} : ${p.games} partie(s), ${p.wins} victoire(s), taux ${pct(p.winRate)}`}
                  style={({ pressed }) => [styles.playerRow, { borderBottomColor: colors.border, backgroundColor: pressed ? colors.surfacePressed : 'transparent' }]}
                  testID={`player-stat-${p.key}`}
                >
                  <PlayerAvatar name={p.name} size={36} />
                  <View style={styles.flexCol}>
                    <AppText variant="bodyStrong">{p.name}</AppText>
                    <AppText variant="caption" tone="muted">
                      {p.games} partie(s) · {p.wins} victoire(s) · maire {p.mayorTimes} fois
                    </AppText>
                  </View>
                  <AppText variant="bodyStrong" tone="accent">
                    {pct(p.winRate)}
                  </AppText>
                  <Icon name="chevron-right" color={colors.textFaint} size={18} />
                </Pressable>
              ))
            )}
          </Panel>
          <SectionTitle>Victoires par camp</SectionTitle>
          <Panel testID="stats-wins">
            {stats.winsByCamp.length === 0 ? (
              <AppText variant="small" tone="muted">
                Aucune partie terminée avec un vainqueur.
              </AppText>
            ) : (
              stats.winsByCamp.map((w) => <BarRow key={w.winner} label={WINNER_LABELS[w.winner]} value={w.count} max={stats.winsByCamp[0].count} />)
            )}
            <AppText variant="caption" tone="faint">
              Sur {stats.decided} partie(s) terminée(s){stats.abandoned ? ` · ${stats.abandoned} interrompue(s) exclue(s)` : ''}.
            </AppText>
          </Panel>
          <SectionTitle>Rôles les plus joués</SectionTitle>
          <Panel testID="stats-roles">
            {stats.rolesPlayed.slice(0, 10).map((r) => (
              <BarRow key={r.roleId} label={name(r.roleId)} value={r.count} max={stats.rolesPlayed[0].count} />
            ))}
            <AppText variant="caption" tone="faint">
              Nombre de cartes distribuées, toutes parties confondues.
            </AppText>
          </Panel>
          {stats.decided > 0 ? (
            <>
              <SectionTitle>Victoires par rôle</SectionTitle>
              <Panel testID="stats-role-wins">
                {stats.roleWins.slice(0, 10).map((r) => (
                  <BarRow key={r.roleId} label={`${name(r.roleId)} (${r.won}/${r.played})`} value={Math.round((r.won / r.played) * 100)} max={100} suffix=" %" />
                ))}
                <AppText variant="caption" tone="faint">
                  Part des parties terminées où le rôle figurait parmi les gagnants. Peu significatif sur peu de parties.
                </AppText>
              </Panel>
            </>
          ) : null}
        </>
      )}
      <Sheet visible={detail !== null} title={detail?.name ?? ''} subtitle={detail ? `${detail.games} partie(s) jouée(s)` : undefined} onClose={() => setDetail(null)} testID="player-stat-sheet">
        {detail ? (
          <>
            <View style={styles.tiles}>
              <Tile value={pct(detail.winRate)} label="de victoires" />
              <Tile value={detail.firstNightDeaths} label="morts la 1ʳᵉ nuit" />
              <Tile value={detail.mayorTimes} label="fois maire" />
              <Tile value={detail.survived} label="fois survivant" />
            </View>
            <AppText variant="overline" tone="muted">
              Rôles joués
            </AppText>
            {detail.roles.map((r) => (
              <BarRow key={r.roleId} label={name(r.roleId)} value={r.count} max={detail.roles[0].count} />
            ))}
            <AppText variant="caption" tone="faint">
              Taux calculé sur {detail.decided} partie(s) terminée(s) avec un vainqueur.
            </AppText>
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.md },
  flexCol: { flex: 1, gap: 1 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 56 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { flexBasis: '47%', flexGrow: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 30 },
  barLabel: { width: 130 },
  track: { flex: 1, height: 10, borderRadius: radius.sm, overflow: 'hidden' },
  fill: { height: '100%', borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  barValue: { minWidth: 44, textAlign: 'right' },
});
