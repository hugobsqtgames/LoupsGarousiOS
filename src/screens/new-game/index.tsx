import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { normalizeVariants } from '@/engine';
import { Button } from '@/components/button';
import { useFeedback } from '@/components/feedback';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useAppStore } from '@/state/app-store';
import { buildSetup, cardCount, draftFromComposition, draftIssues, emptyDraft, nameIssues } from '@/state/draft';
import { useDraftStore } from '@/state/draft-store';
import { useGameStore } from '@/state/game-store';
import { useTheme } from '@/theme/theme-context';
import { spacing } from '@/theme/themes';
import { makeId } from '@/utils/id';
import { StepAssign } from './step-assign';
import { StepPlayers } from './step-players';
import { StepReview } from './step-review';
import { StepRoles } from './step-roles';
import { VariantsEditor } from './step-variants';

const STEPS = ['Joueurs', 'Cartes', 'Attribution', 'Variantes', 'Récapitulatif'] as const;

function Progress({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.progress} accessibilityRole="tablist">
      {STEPS.map((label, i) => (
        <View key={label} style={styles.progressItem}>
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel={`Étape ${i + 1} : ${label}`}
            accessibilityState={{ selected: i === step, disabled: i >= step }}
            disabled={i >= step}
            onPress={() => onJump(i)}
            style={styles.progressHit}
          >
            <View style={[styles.bar, { backgroundColor: i <= step ? colors.accent : colors.surfacePressed }]} />
            <AppText variant="caption" tone={i === step ? 'accent' : 'faint'} numberOfLines={1}>
              {label}
            </AppText>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

export function NewGameScreen() {
  const params = useLocalSearchParams<{ composition?: string; fresh?: string }>();
  const settings = useAppStore((s) => s.settings);
  const compositions = useAppStore((s) => s.compositions);
  const customRoles = useAppStore((s) => s.customRoles);
  const { draft, step, hydrated, hydrate, setStep, update, reset, clearSaved } = useDraftStore();
  const createGame = useGameStore((s) => s.create);
  const { confirm, alert } = useFeedback();

  useEffect(() => {
    void hydrate(settings.defaultVariants);
  }, [hydrate, settings.defaultVariants]);

  useEffect(() => {
    if (!hydrated) return;
    if (params.composition) {
      const c = compositions.find((x) => x.id === params.composition);
      if (c) reset(settings.defaultVariants, { ...draftFromComposition(c, emptyDraft(settings.defaultVariants), () => makeId('pl')), variants: normalizeVariants({ ...settings.defaultVariants, ...(typeof c.variants === 'object' && c.variants !== null ? c.variants : {}) }) });
      router.setParams({ composition: undefined });
    } else if (params.fresh) {
      reset(settings.defaultVariants);
      router.setParams({ fresh: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, params.composition, params.fresh]);

  const issues = useMemo(() => draftIssues(draft, customRoles), [draft, customRoles]);
  const errors = issues.filter((i) => i.level === 'error');

  const blocker = (): string | null => {
    if (step === 0) {
      if (draft.players.length < 5) return 'Ajoutez au moins 5 joueurs.';
      if (nameIssues(draft.players).length > 0) return 'Corrigez les noms en double.';
    }
    if (step === 1 && cardCount(draft) !== draft.players.length) return `Sélectionnez exactement ${draft.players.length} cartes (actuellement ${cardCount(draft)}).`;
    if (step === 2 && draft.assignMode === 'manual' && draft.players.some((p) => !draft.assignments[p.id])) return 'Attribuez une carte à chaque joueur.';
    return null;
  };
  const block = blocker();

  const launch = async () => {
    if (errors.length > 0) {
      await alert('Composition incomplète', errors.map((e) => e.message).join('\n'));
      return;
    }
    const ok = await confirm({ title: 'Lancer la partie ?', message: `${draft.players.length} joueurs. Le village s’endort…`, confirmLabel: 'Lancer' });
    if (!ok) return;
    const setup = buildSetup(draft, makeId('game'), new Date().toISOString(), customRoles);
    const r = await createGame(setup);
    if (!r.ok) {
      await alert('Impossible de lancer la partie', r.error);
      return;
    }
    await clearSaved().catch(() => undefined);
    reset(settings.defaultVariants);
    router.replace({ pathname: '/game/[id]', params: { id: setup.id } });
  };

  const restart = async () => {
    if (await confirm({ title: 'Recommencer la configuration ?', message: 'Les joueurs et cartes saisis seront effacés.', confirmLabel: 'Tout effacer', destructive: true })) reset(settings.defaultVariants);
  };

  if (!hydrated) return <Screen title="Nouvelle partie" back>{null}</Screen>;

  return (
    <Screen
      overline={`Étape ${step + 1} sur ${STEPS.length}`}
      title={STEPS[step]}
      back
      right={<Button label="Effacer" variant="ghost" size="sm" icon="trash" onPress={() => void restart()} testID="reset-draft" />}
      footer={
        <View style={styles.footer}>
          {block ? (
            <AppText variant="caption" tone="warning" align="center" testID="step-blocker">
              {block}
            </AppText>
          ) : null}
          <View style={styles.footerRow}>
            {step > 0 ? <Button label="Précédent" variant="secondary" icon="chevron-left" onPress={() => setStep(step - 1)} style={styles.flex} testID="prev-step" /> : null}
            {step < STEPS.length - 1 ? (
              <Button label="Suivant" iconRight="chevron-right" disabled={!!block} onPress={() => setStep(step + 1)} style={styles.flex} testID="next-step" />
            ) : (
              <Button label="Lancer la partie" icon="moon" disabled={errors.length > 0} onPress={launch} style={styles.flex} testID="launch-game" />
            )}
          </View>
        </View>
      }
    >
      <Progress step={step} onJump={setStep} />
      {step === 0 ? <StepPlayers /> : null}
      {step === 1 ? <StepRoles /> : null}
      {step === 2 ? <StepAssign /> : null}
      {step === 3 ? <VariantsEditor value={draft.variants} onChange={(variants) => update({ variants })} /> : null}
      {step === 4 ? <StepReview issues={issues} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progress: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  progressItem: { flex: 1, gap: 4 },
  progressHit: { gap: 4, paddingVertical: 4 },
  bar: { height: 4, borderRadius: 2 },
  footer: { gap: spacing.sm },
  footerRow: { flexDirection: 'row', gap: spacing.md },
});
