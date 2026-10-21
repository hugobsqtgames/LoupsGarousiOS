import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { computeNightSteps, nameOf, phaseLabel, STEP_TITLES, type NightStep, type StepPayload } from '@/engine';
import { useAudio } from '@/audio/audio-context';
import { Button, IconButton } from '@/components/button';
import { useFeedback } from '@/components/feedback';
import { RoleMedallion } from '@/components/game-ui';
import { Icon } from '@/components/icon';
import { Panel } from '@/components/panel';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useGameAction, useGameState } from '@/hooks/use-game';
import { useRoleRegistry } from '@/hooks/use-roles';
import { useGameStore } from '@/state/game-store';
import { useTheme } from '@/theme/theme-context';
import { radius, spacing } from '@/theme/themes';
import { sleepScript, stepTitle, wakeScript } from './scripts';
import { defaultValue, isComplete, StepForm } from './step-form';
import { toDashboard } from '@/utils/nav';

function Timeline({ steps, current, onSelect }: { steps: NightStep[]; current: string | null; onSelect: (key: string) => void }) {
  const { colors } = useTheme();
  const { registry } = useRoleRegistry();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeline} testID="night-timeline">
      {steps.map((s, i) => {
        const done = s.payload !== undefined;
        const active = s.key === current;
        const reachable = done || active;
        return (
          <Pressable
            key={s.key}
            disabled={!reachable}
            onPress={() => onSelect(s.key)}
            accessibilityRole="button"
            accessibilityLabel={`Étape ${i + 1} : ${stepTitle(s, registry, STEP_TITLES)}${done ? ', faite' : ''}`}
            accessibilityState={{ selected: active, disabled: !reachable }}
            style={[styles.dot, { borderColor: active ? colors.accent : colors.border, backgroundColor: done ? colors.surfaceRaised : colors.surface, opacity: reachable ? 1 : 0.5 }]}
            testID={`timeline-${i}`}
          >
            {done ? <Icon name="check" color={colors.success} size={14} /> : <AppText variant="caption" tone={active ? 'accent' : 'faint'}>{i + 1}</AppText>}
            <AppText variant="caption" tone={active ? 'accent' : done ? 'muted' : 'faint'} numberOfLines={1} style={styles.dotLabel}>
              {stepTitle(s, registry, STEP_TITLES).replace(/^(Le |La |Les |L’)/, '')}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Summary({ steps }: { steps: NightStep[] }) {
  const state = useGameState();
  const { registry } = useRoleRegistry();
  const describe = (s: NightStep): string => {
    const p = s.payload ?? {};
    if (s.kind === 'bluff') return 'Appel pour la forme';
    if (s.kind === 'witch') return [p.heal ? `sauve ${nameOf(state, p.heal)}` : null, p.poison ? `empoisonne ${nameOf(state, p.poison)}` : null].filter(Boolean).join(', ') || 'aucune potion';
    if (s.kind === 'thief' || s.kind === 'comedian') return p.cardIndex === null || p.cardIndex === undefined ? 'aucune carte' : 'carte choisie';
    if (s.kind === 'wolfhound') return p.team === 'wolves' ? 'rejoint les loups' : 'reste villageois';
    if (s.kind === 'infect') return p.infect ? 'infecte la victime' : 'n’infecte pas';
    if (p.targets) return p.targets.map((t) => nameOf(state, t)).join(' et ');
    if (p.littleGirlCaught) return 'Petite Fille surprise';
    if ('target' in p) return p.target ? nameOf(state, p.target) : 'personne';
    return 'fait';
  };
  return (
    <Panel overline="Récapitulatif de la nuit" testID="night-summary">
      {steps.map((s) => (
        <View key={s.key} style={styles.summaryRow}>
          <AppText variant="small" style={styles.flex}>
            {stepTitle(s, registry, STEP_TITLES)}
          </AppText>
          <AppText variant="small" tone="muted">
            {describe(s)}
          </AppText>
        </View>
      ))}
    </Panel>
  );
}

export function NightScreen() {
  const state = useGameState();
  const act = useGameAction();
  const hide = useGameStore((s) => s.hideSecrets);
  const { registry } = useRoleRegistry();
  const { confirm } = useFeedback();
  const { colors } = useTheme();
  const audio = useAudio();
  const steps = useMemo(() => computeNightSteps(state), [state]);
  const firstPending = steps.find((s) => s.payload === undefined) ?? null;
  const [viewKey, setViewKey] = useState<string | null>(null);
  const viewed = (viewKey ? steps.find((s) => s.key === viewKey) : null) ?? firstPending;
  // Saisies en cours, indexées par étape : changer d'étape ne perd ni ne mélange rien.
  const [drafts, setDrafts] = useState<Record<string, StepPayload>>({});
  const [actorsShown, setActorsShown] = useState<Record<string, boolean>>({});
  const value: StepPayload = viewed ? (drafts[viewed.key] ?? defaultValue(viewed)) : {};
  const setValue = (v: StepPayload) => viewed && setDrafts((d) => ({ ...d, [viewed.key]: v }));
  const showActors = viewed ? (actorsShown[viewed.key] ?? !hide) : false;
  const lastNarrated = useRef<string | null>(null);

  useEffect(() => {
    if (!viewed || viewKey || lastNarrated.current === viewed.key) return;
    lastNarrated.current = viewed.key;
    audio.play('step');
    audio.narrate(wakeScript(viewed, registry));
  }, [viewed, viewKey, audio, registry]);

  if (state.phase.kind !== 'night') {
    return (
      <Screen title="Nuit terminée" back>
        <Panel>
          <AppText tone="muted">La nuit a déjà été résolue.</AppText>
          <Button label="Voir le bilan de l’aube" icon="sunrise" onPress={() => router.replace({ pathname: '/game/[id]/dawn', params: { id: state.setup.id } })} />
        </Panel>
      </Screen>
    );
  }

  const index = viewed ? steps.findIndex((s) => s.key === viewed.key) : steps.length;
  const submit = () => {
    if (!viewed) return;
    const sleep = sleepScript(viewed, registry);
    if (act({ type: 'night/submit', stepKey: viewed.key, payload: value }, { sound: 'confirm' })) {
      if (sleep && !viewKey) audio.narrate(sleep);
      setDrafts((d) => {
        const next = { ...d };
        delete next[viewed.key];
        return next;
      });
      setViewKey(null);
    }
  };

  const resolve = async () => {
    const ok = await confirm({ title: 'Résoudre la nuit ?', message: 'Les conséquences seront calculées. Vous pourrez encore annuler depuis l’historique.', confirmLabel: 'Le jour se lève' });
    if (ok && act({ type: 'night/resolve' })) router.replace({ pathname: '/game/[id]/dawn', params: { id: state.setup.id } });
  };

  const role = viewed?.roleId && registry.has(viewed.roleId) ? registry.get(viewed.roleId) : null;
  const complete = viewed ? isComplete(viewed, value, state) : false;

  return (
    <Screen
      overline={`${phaseLabel(state.phase)} · ${viewed ? `étape ${index + 1} sur ${steps.length}` : 'toutes les étapes renseignées'}`}
      title={viewed ? stepTitle(viewed, registry, STEP_TITLES) : 'Fin de la nuit'}
      back={() => toDashboard(state.setup.id)}
      right={<IconButton icon="list" label="Tableau de bord" onPress={() => toDashboard(state.setup.id)} />}
      footer={
        viewed ? (
          <View style={styles.footerRow}>
            {viewKey ? <Button label="Revenir" variant="secondary" icon="chevron-left" onPress={() => setViewKey(null)} style={styles.flex} testID="back-to-current" /> : null}
            <Button
              label={viewKey ? 'Corriger' : viewed.kind === 'bluff' ? 'Passer' : 'Valider · se rendort'}
              icon={viewKey ? 'edit' : 'check'}
              disabled={!complete}
              onPress={submit}
              style={styles.flex}
              testID="submit-step"
            />
          </View>
        ) : (
          <Button label="Résoudre la nuit" icon="sunrise" size="lg" onPress={resolve} testID="resolve-night" />
        )
      }
    >
      <Timeline steps={steps} current={viewed?.key ?? null} onSelect={(k) => setViewKey(k === firstPending?.key ? null : k)} />
      {viewed ? (
        <>
          {viewKey ? (
            <Panel tone="warning">
              <AppText variant="small" tone="warning">
                Correction d’une étape déjà validée : les étapes suivantes qui en dépendent seront à refaire.
              </AppText>
            </Panel>
          ) : null}
          <Panel tone="raised" testID="step-card">
            <View style={styles.cardHead}>
              {role ? <RoleMedallion role={role} size={56} /> : <RoleMedallion role={{ icon: viewed.kind === 'charmed' ? 'flute' : 'heart', team: 'solo' }} size={56} />}
              <View style={styles.flex}>
                <AppText variant="overline" tone={viewed.bluff ? 'muted' : 'accent'}>
                  {viewed.bluff ? 'Appel pour la forme' : 'À dire au village'}
                </AppText>
                <AppText variant="heading" testID="wake-script">
                  « {wakeScript(viewed, registry)} »
                </AppText>
              </View>
            </View>
            {viewed.actorIds.length > 0 && viewed.kind !== 'lovers' && viewed.kind !== 'charmed' ? (
              <Pressable onPress={() => setActorsShown((m) => ({ ...m, [viewed.key]: !showActors }))} accessibilityRole="button" accessibilityLabel={showActors ? 'Masquer les joueurs concernés' : 'Afficher les joueurs concernés'} style={styles.actors} testID="toggle-actors">
                <Icon name={showActors ? 'eye' : 'eye-off'} color={colors.textMuted} size={16} />
                <AppText variant="small" tone="muted">
                  {showActors ? viewed.actorIds.map((id) => nameOf(state, id)).join(', ') : 'Joueur(s) concerné(s) masqué(s) — toucher pour afficher'}
                </AppText>
              </Pressable>
            ) : null}
          </Panel>
          <StepForm state={state} step={viewed} value={value} onChange={setValue} />
        </>
      ) : (
        <Summary steps={steps} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footerRow: { flexDirection: 'row', gap: spacing.md },
  timeline: { gap: spacing.sm, paddingVertical: spacing.xs },
  dot: { minWidth: 64, maxWidth: 110, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 6, alignItems: 'center', gap: 2 },
  dotLabel: { maxWidth: 96 },
  cardHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  actors: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  summaryRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: 4 },
});
