import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DEFAULT_VARIANTS, VARIANT_OPTIONS, type SetupIssue } from '@/engine';
import { Button } from '@/components/button';
import { TextField } from '@/components/controls';
import { useFeedback } from '@/components/feedback';
import { RoleMedallion } from '@/components/game-ui';
import { Icon } from '@/components/icon';
import { Panel, SectionTitle } from '@/components/panel';
import { Sheet } from '@/components/sheet';
import { AppText } from '@/components/text';
import { useRoleRegistry } from '@/hooks/use-roles';
import { useAppStore } from '@/state/app-store';
import { extraCardsOf, rolesFromCounts } from '@/state/draft';
import { useDraftStore } from '@/state/draft-store';
import { useTheme } from '@/theme/theme-context';
import { spacing } from '@/theme/themes';
import { makeId } from '@/utils/id';

export function IssuesPanel({ issues }: { issues: SetupIssue[] }) {
  const { colors } = useTheme();
  if (issues.length === 0) {
    return (
      <Panel testID="issues-ok">
        <View style={styles.inline}>
          <Icon name="check" color={colors.success} />
          <AppText variant="bodyStrong" tone="success">
            Composition cohérente : prête à lancer.
          </AppText>
        </View>
      </Panel>
    );
  }
  const errors = issues.filter((i) => i.level === 'error');
  return (
    <Panel tone={errors.length ? 'danger' : 'warning'} overline={errors.length ? `${errors.length} problème(s) bloquant(s)` : 'Avertissements'} testID="issues-panel">
      {issues.map((i, k) => (
        <View key={k} style={styles.inline}>
          <Icon name={i.level === 'error' ? 'x' : 'alert'} color={i.level === 'error' ? colors.danger : colors.warning} size={16} />
          <AppText variant="small" tone={i.level === 'error' ? 'danger' : 'warning'} style={styles.flex}>
            {i.message}
          </AppText>
        </View>
      ))}
    </Panel>
  );
}

export function StepReview({ issues }: { issues: SetupIssue[] }) {
  const draft = useDraftStore((s) => s.draft);
  const update = useDraftStore((s) => s.update);
  const saveComposition = useAppStore((s) => s.saveComposition);
  const { registry } = useRoleRegistry();
  const { toast } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [favName, setFavName] = useState('');
  const roles = rolesFromCounts(draft.roleCounts);
  const grouped = [...new Set(roles)].map((r) => ({ r, n: roles.filter((x) => x === r).length }));
  const changed = VARIANT_OPTIONS.filter((o) => draft.variants[o.key] !== DEFAULT_VARIANTS[o.key]);

  return (
    <View style={styles.gap}>
      <TextField label="Nom de la partie (facultatif)" placeholder="Ex. : Soirée du vendredi" value={draft.name} onChangeText={(name) => update({ name })} maxLength={60} testID="game-name" />
      <IssuesPanel issues={issues} />
      <SectionTitle>{`${draft.players.length} joueurs · ${roles.length} cartes`}</SectionTitle>
      <Panel>
        <View style={styles.wrap}>
          {grouped.map(({ r, n }) => {
            const def = registry.has(r) ? registry.get(r) : null;
            if (!def) return null;
            return (
              <View key={r} style={styles.roleChip}>
                <RoleMedallion role={def} size={30} />
                <AppText variant="small">
                  {def.name}
                  {n > 1 ? ` ×${n}` : ''}
                </AppText>
              </View>
            );
          })}
        </View>
        {extraCardsOf(draft).length > 0 ? (
          <AppText variant="caption" tone="muted">
            Hors jeu : {extraCardsOf(draft).map((c) => (registry.has(c) ? registry.get(c).name : c)).join(', ')}
          </AppText>
        ) : null}
      </Panel>
      <SectionTitle>Variantes</SectionTitle>
      <Panel>
        {changed.length === 0 ? (
          <AppText variant="small" tone="muted">
            Règles par défaut (règle de base et interprétations documentées).
          </AppText>
        ) : (
          changed.map((o) => {
            const v = draft.variants[o.key];
            const label = o.choices ? (o.choices as { value: unknown; label: string }[]).find((c) => c.value === v)?.label : v ? 'Activé' : 'Désactivé';
            return (
              <AppText key={o.key} variant="small">
                {o.label} : <AppText variant="small" tone="accent">{label}</AppText>
              </AppText>
            );
          })
        )}
      </Panel>
      <Button label="Enregistrer comme composition favorite" icon="favorite" variant="quiet" onPress={() => setSaving(true)} testID="save-favorite" />
      <Sheet
        visible={saving}
        title="Composition favorite"
        subtitle="Les rôles, cartes hors jeu, variantes et noms des joueurs seront enregistrés."
        onClose={() => setSaving(false)}
        footer={
          <Button
            label="Enregistrer"
            icon="save"
            disabled={!favName.trim()}
            onPress={async () => {
              try {
                await saveComposition({ id: makeId('comp'), name: favName.trim(), createdAt: new Date().toISOString(), roles, extraCards: extraCardsOf(draft), variants: draft.variants, playerNames: draft.players.map((p) => p.name) });
                toast('Composition enregistrée');
                setSaving(false);
                setFavName('');
              } catch (e) {
                toast(`Échec de l’enregistrement : ${(e as Error).message}`, 'error');
              }
            }}
            testID="confirm-save-favorite"
          />
        }
      >
        <TextField label="Nom" value={favName} onChangeText={setFavName} placeholder="Ex. : Classique à 10" maxLength={40} autoFocus testID="favorite-name" />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  roleChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingRight: spacing.sm },
});
