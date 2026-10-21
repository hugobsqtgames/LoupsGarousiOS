import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CERTAINTY_LABELS, DEATH_CAUSE_LABELS, describeEntry, loverOf, nameOf, TEAM_LABELS, type GameEvent, type PlayerId } from '@/engine';
import { Button } from '@/components/button';
import { useFeedback } from '@/components/feedback';
import { PlayerAvatar, RoleMedallion } from '@/components/game-ui';
import { Chip, Panel, SectionTitle } from '@/components/panel';
import { playerBadges } from '@/components/player-row';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useGameAction, useGameState } from '@/hooks/use-game';
import { useRoleRegistry } from '@/hooks/use-roles';
import { useGameStore } from '@/state/game-store';
import { useTheme } from '@/theme/theme-context';
import { spacing, teamColor } from '@/theme/themes';

const USE_LABELS: Record<string, string> = {
  heal: 'Potion de vie',
  poison: 'Potion de mort',
  shot: 'Tir à la mort',
  extraLife: 'Vie supplémentaire',
  infect: 'Infection',
  judge: 'Second vote',
  servant: 'Prise de rôle',
  custom: 'Pouvoir personnalisé',
};

function concerns(e: GameEvent, id: PlayerId): boolean {
  return JSON.stringify(e).includes(`"${id}"`);
}

export function PlayerScreen() {
  const state = useGameState();
  const { pid } = useLocalSearchParams<{ pid: string }>();
  const hideDefault = useGameStore((s) => s.hideSecrets);
  const [reveal, setReveal] = useState(!hideDefault);
  const act = useGameAction();
  const { confirm } = useFeedback();
  const { registry } = useRoleRegistry();
  const { colors } = useTheme();
  const p = state.players.find((x) => x.id === pid);
  if (!p) {
    return (
      <Screen title="Joueur introuvable" back>
        <AppText tone="muted">Ce joueur n’existe pas dans cette partie.</AppText>
      </Screen>
    );
  }
  const role = registry.has(p.roleId) ? registry.get(p.roleId) : null;
  const original = p.originalRoleId !== p.roleId && registry.has(p.originalRoleId) ? registry.get(p.originalRoleId) : null;
  const lover = loverOf(state, p.id);
  const history = state.log.filter((e) => concerns(e.event, p.id) && e.event.type !== 'vote');
  const badges = playerBadges(state, p, false);
  const canEliminate = p.alive && (state.phase.kind === 'day' || state.phase.kind === 'dawn') && !state.victory;

  return (
    <Screen overline={`Place ${p.seat + 1}`} title={p.name} back>
      <Panel tone="raised" testID="player-card">
        <View style={styles.head}>
          <PlayerAvatar name={p.name} alive={p.alive} mayor={state.mayorId === p.id} team={reveal ? p.team : null} size={60} />
          <View style={styles.flex}>
            <AppText variant="heading">{p.alive ? 'En vie' : 'Éliminé(e)'}</AppText>
            {p.death ? (
              <AppText variant="small" tone="muted">
                {DEATH_CAUSE_LABELS[p.death.cause]} · {p.death.phaseLabel}
              </AppText>
            ) : null}
          </View>
          <Button label={reveal ? 'Masquer' : 'Révéler'} icon={reveal ? 'eye-off' : 'eye'} size="sm" variant="secondary" onPress={() => setReveal((v) => !v)} testID="reveal-role" />
        </View>
      </Panel>

      {reveal && role ? (
        <>
          <Panel overline="Rôle secret" testID="player-role">
            <View style={styles.head}>
              <RoleMedallion role={role} size={52} />
              <View style={styles.flex}>
                <AppText variant="title">{role.name}</AppText>
                <AppText variant="small" color={teamColor(colors, p.team)}>
                  Camp actuel : {TEAM_LABELS[p.team]}
                </AppText>
              </View>
            </View>
            <AppText variant="small" tone="muted">
              {role.summary}
            </AppText>
            {original ? (
              <AppText variant="caption" tone="muted">
                Carte d’origine : {original.name}
              </AppText>
            ) : null}
            <AppText variant="caption" tone="faint">
              {CERTAINTY_LABELS[role.certainty]}
            </AppText>
          </Panel>
          {Object.keys(p.uses).length > 0 ? (
            <Panel overline="Pouvoirs">
              {Object.entries(p.uses).map(([k, v]) => (
                <View key={k} style={styles.useRow}>
                  <AppText variant="body" style={styles.flex}>
                    {USE_LABELS[k] ?? k}
                  </AppText>
                  <Chip label={v === -1 ? 'Illimité' : v > 0 ? `${v} disponible(s)` : 'Utilisé'} color={v !== 0 ? colors.success : colors.textFaint} />
                </View>
              ))}
              {p.powersLost || (state.villagePowersLost && p.team === 'village') ? (
                <AppText variant="small" tone="warning">
                  Pouvoirs perdus.
                </AppText>
              ) : null}
              {p.foxPowerLost ? (
                <AppText variant="small" tone="warning">
                  Le Renard a perdu son flair.
                </AppText>
              ) : null}
            </Panel>
          ) : null}
          <Panel overline="Statuts et effets">
            {badges.length === 0 && !lover && !p.lastProtected && !p.wildChildModel ? (
              <AppText variant="small" tone="muted">
                Aucun statut particulier.
              </AppText>
            ) : null}
            <View style={styles.wrap}>
              {badges.map((b) => (
                <Chip key={b.label} label={b.label} color={b.color === 'accent' ? colors.accent : b.color === 'wolves' ? colors.wolves : b.color === 'solo' ? colors.solo : colors.textMuted} />
              ))}
            </View>
            {lover ? <AppText variant="small">Amoureux de {nameOf(state, lover)}.</AppText> : null}
            {p.lastProtected ? <AppText variant="small">A protégé {nameOf(state, p.lastProtected)} la nuit dernière.</AppText> : null}
            {p.wildChildModel ? <AppText variant="small">Modèle : {nameOf(state, p.wildChildModel)}.</AppText> : null}
            {state.setup.sectGroups?.[p.id] ? <AppText variant="small">Groupe du Sectaire : {state.setup.sectGroups[p.id]}.</AppText> : null}
          </Panel>
        </>
      ) : null}

      <SectionTitle>Historique du joueur</SectionTitle>
      <Panel>
        {history.length === 0 ? (
          <AppText variant="small" tone="muted">
            Aucun événement.
          </AppText>
        ) : (
          history.map((e) => (
            <View key={e.seq} style={styles.histRow}>
              <AppText variant="caption" tone="faint" style={styles.histPhase}>
                {e.phaseLabel}
              </AppText>
              <AppText variant="small" style={styles.flex}>
                {describeEntry(state, e, !reveal)}
              </AppText>
            </View>
          ))
        )}
      </Panel>

      {canEliminate ? (
        <Button
          label="Élimination manuelle"
          icon="skull"
          variant="danger"
          onPress={async () => {
            if (
              await confirm({
                title: `Éliminer ${p.name} ?`,
                message: 'À utiliser pour appliquer une règle non gérée par l’application. Les effets de mort (Amoureux, Chasseur, maire…) seront déclenchés.',
                confirmLabel: 'Éliminer',
                destructive: true,
              })
            ) {
              if (act({ type: 'mj/eliminate', playerId: p.id }, { success: `${p.name} est éliminé(e)` })) router.back();
            }
          }}
          testID="manual-eliminate"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  useRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  histRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: 3 },
  histPhase: { width: 64 },
});
