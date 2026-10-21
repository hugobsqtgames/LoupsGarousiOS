import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { describeEntry, DEATH_CAUSE_LABELS, nameOf, phaseLabel, roleName, WINNER_LABELS } from '@/engine';
import { Button } from '@/components/button';
import { DecisionPanel } from '@/components/decision-panel';
import { useFeedback } from '@/components/feedback';
import { RoleMedallion } from '@/components/game-ui';
import { Icon } from '@/components/icon';
import { Panel, SectionTitle } from '@/components/panel';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useGameAction, useGameState } from '@/hooks/use-game';
import { useRoleRegistry } from '@/hooks/use-roles';
import { useGameStore } from '@/state/game-store';
import { useTheme } from '@/theme/theme-context';
import { spacing } from '@/theme/themes';
import { toDashboard } from '@/utils/nav';

export function DawnScreen() {
  const state = useGameState();
  const act = useGameAction();
  const hide = useGameStore((s) => s.hideSecrets);
  const { confirm } = useFeedback();
  const { registry } = useRoleRegistry();
  const { colors } = useTheme();
  const [showDetails, setShowDetails] = useState(!hide);
  const deaths = state.dawnReport.filter((e) => e.event.type === 'death');
  const bear = state.dawnReport.find((e) => e.event.type === 'bear');
  const idParams = { id: state.setup.id };

  if (state.phase.kind !== 'dawn') {
    return (
      <Screen title="Aube" back>
        <Panel>
          <AppText tone="muted">Ce bilan n’est plus d’actualité : la partie est en {phaseLabel(state.phase).toLowerCase()}.</AppText>
          <Button label="Tableau de bord" icon="home" onPress={() => toDashboard(state.setup.id)} />
        </Panel>
      </Screen>
    );
  }

  const toDay = async () => {
    if (await confirm({ title: 'Le village se réveille', message: 'Passer au jour ?', confirmLabel: 'Commencer le jour' })) {
      if (act({ type: 'dawn/confirm' })) toDashboard(state.setup.id);
    }
  };

  return (
    <Screen
      overline={phaseLabel(state.phase)}
      title="Le village se réveille"
      mood="dawn"
      back={() => toDashboard(state.setup.id)}
      footer={
        state.victory ? (
          <Button
            label={`Victoire : ${WINNER_LABELS[state.victory.winner]} — terminer`}
            icon="flag"
            size="lg"
            onPress={async () => {
              if (await confirm({ title: 'Terminer la partie ?', message: state.victory?.reason, confirmLabel: 'Terminer' })) {
                if (act({ type: 'game/finish' })) router.replace({ pathname: '/game/[id]/summary', params: idParams });
              }
            }}
            testID="finish-from-dawn"
          />
        ) : (
          <Button label="Passer au jour" icon="sun" size="lg" disabled={state.pending.length > 0} onPress={toDay} testID="start-day" />
        )
      }
    >
      <Panel tone="accent" overline="À annoncer au village" testID="dawn-announce">
        {deaths.length === 0 ? (
          <AppText variant="title">Personne n’est mort cette nuit.</AppText>
        ) : (
          deaths.map((e) =>
            e.event.type === 'death' ? (
              <View key={e.seq} style={styles.death}>
                <RoleMedallion role={registry.has(e.event.roleId) ? registry.get(e.event.roleId) : { icon: 'custom', team: 'village' }} size={44} />
                <View style={styles.flex}>
                  <AppText variant="heading">{nameOf(state, e.event.playerId)}</AppText>
                  <AppText variant="small" tone="muted">
                    était {roleName(state, e.event.roleId)} — {DEATH_CAUSE_LABELS[e.event.cause]}
                  </AppText>
                </View>
              </View>
            ) : null,
          )
        )}
        {bear && bear.event.type === 'bear' ? (
          <View style={styles.inline}>
            <Icon name="bear" color={bear.event.growled ? colors.danger : colors.textMuted} />
            <AppText variant="bodyStrong" tone={bear.event.growled ? 'danger' : 'muted'}>
              {bear.event.growled ? 'Grognez : l’ours du Montreur grogne !' : 'L’ours reste silencieux.'}
            </AppText>
          </View>
        ) : null}
      </Panel>

      {state.pending.length > 0 ? <DecisionPanel state={state} /> : null}

      {state.victory ? (
        <Panel tone="accent" overline="Condition de victoire atteinte" title={WINNER_LABELS[state.victory.winner]} testID="dawn-victory">
          <AppText variant="small" tone="muted">
            {state.victory.reason}
          </AppText>
        </Panel>
      ) : null}

      <SectionTitle right={<Button label={showDetails ? 'Masquer' : 'Afficher'} size="sm" variant="ghost" icon={showDetails ? 'eye-off' : 'eye'} onPress={() => setShowDetails((v) => !v)} testID="toggle-dawn-details" />}>
        Détail pour le MJ seulement
      </SectionTitle>
      <Panel testID="dawn-details">
        {showDetails ? (
          state.dawnReport.filter((e) => e.event.type !== 'phase').length === 0 ? (
            <AppText variant="small" tone="muted">
              Aucun événement.
            </AppText>
          ) : (
            state.dawnReport
              .filter((e) => e.event.type !== 'phase')
              .map((e) => (
                <View key={e.seq} style={styles.inline}>
                  <Icon name={e.event.type === 'death' ? 'skull' : e.event.type === 'attack-blocked' ? 'shield' : 'moon'} color={e.event.type === 'death' ? colors.danger : colors.textMuted} size={16} />
                  <AppText variant="small" style={styles.flex}>
                    {describeEntry(state, e)}
                  </AppText>
                </View>
              ))
          )
        ) : (
          <AppText variant="small" tone="faint">
            Protections, attaques bloquées et actions secrètes masquées.
          </AppText>
        )}
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  death: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  inline: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
});
