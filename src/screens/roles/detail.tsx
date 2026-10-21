import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { CERTAINTY_LABELS, EXPANSION_LABELS, isCustomRoleId, TEAM_LABELS, type RoleId } from '@/engine';
import { Button } from '@/components/button';
import { useFeedback } from '@/components/feedback';
import { RoleMedallion } from '@/components/game-ui';
import { Chip, Panel, SectionTitle } from '@/components/panel';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useRoleRegistry } from '@/hooks/use-roles';
import { useAppStore } from '@/state/app-store';
import { useTheme } from '@/theme/theme-context';
import { spacing, teamColor } from '@/theme/themes';

function Field({ label, value }: { label: string; value: string }) {
  if (!value || value === '—') return null;
  return (
    <View style={styles.field}>
      <AppText variant="overline" tone="muted">
        {label}
      </AppText>
      <AppText variant="body">{value}</AppText>
    </View>
  );
}

export function RoleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { registry } = useRoleRegistry();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const deleteCustomRole = useAppStore((s) => s.deleteCustomRole);
  const { colors } = useTheme();
  const { confirm, toast } = useFeedback();
  const roleId = id as RoleId;
  if (!registry.has(roleId)) {
    return (
      <Screen title="Rôle introuvable" back>
        <AppText tone="muted">Ce rôle n’existe pas ou a été supprimé.</AppText>
      </Screen>
    );
  }
  const r = registry.get(roleId);
  const fav = settings.favoriteRoles.includes(r.id);
  const certaintyColor = r.certainty === 'officielle' ? colors.success : r.certainty === 'probable' ? colors.info : colors.warning;

  return (
    <Screen overline={`${TEAM_LABELS[r.team]} · ${EXPANSION_LABELS[r.expansion]}`} title={r.name} back>
      <Panel tone="raised">
        <View style={styles.head}>
          <RoleMedallion role={r} size={64} />
          <View style={styles.flex}>
            <AppText variant="body">{r.summary}</AppText>
          </View>
        </View>
        <View style={styles.wrap}>
          <Chip label={TEAM_LABELS[r.team]} color={teamColor(colors, r.team)} />
          <Chip label={CERTAINTY_LABELS[r.certainty]} color={certaintyColor} />
          {r.nightOrder !== null ? <Chip label={`Ordre de nuit : ${r.nightOrder}`} /> : null}
        </View>
        <Button
          label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          icon="favorite"
          variant={fav ? 'secondary' : 'quiet'}
          size="sm"
          onPress={() => updateSettings({ favoriteRoles: fav ? settings.favoriteRoles.filter((x) => x !== r.id) : [...settings.favoriteRoles, r.id] })}
          testID="toggle-favorite"
        />
      </Panel>
      <Panel>
        <Field label="Pouvoir" value={r.power} />
        <Field label="Activation" value={r.activation} />
        <Field label="Moment d’intervention" value={r.timing} />
        <Field label="Utilisations" value={r.uses} />
        <Field label="Cibles possibles" value={r.targets} />
        <Field label="Durée des effets" value={r.effectDuration} />
        <Field label="À sa mort" value={r.onDeath} />
      </Panel>
      {r.restrictions.length ? (
        <>
          <SectionTitle>Restrictions</SectionTitle>
          <Panel>
            {r.restrictions.map((t) => (
              <AppText key={t} variant="small">
                • {t}
              </AppText>
            ))}
          </Panel>
        </>
      ) : null}
      {r.interactions.length ? (
        <>
          <SectionTitle>Interactions</SectionTitle>
          <Panel>
            {r.interactions.map((t) => (
              <AppText key={t} variant="small">
                • {t}
              </AppText>
            ))}
          </Panel>
        </>
      ) : null}
      {r.uncertainties.length ? (
        <>
          <SectionTitle>Points non confirmés</SectionTitle>
          <Panel tone="warning">
            {r.uncertainties.map((t) => (
              <AppText key={t} variant="small" tone="warning">
                • {t}
              </AppText>
            ))}
          </Panel>
        </>
      ) : null}
      <SectionTitle>Sources</SectionTitle>
      <Panel>
        {r.sources.map((t) => (
          <AppText key={t} variant="caption" tone="muted">
            {t}
          </AppText>
        ))}
      </Panel>
      {isCustomRoleId(r.id) ? (
        <View style={styles.row}>
          <Button label="Modifier" icon="edit" variant="secondary" onPress={() => router.push({ pathname: '/roles/custom', params: { id: r.id } })} style={styles.flex} testID="edit-custom" />
          <Button
            label="Supprimer"
            icon="trash"
            variant="danger"
            style={styles.flex}
            onPress={async () => {
              if (await confirm({ title: 'Supprimer ce rôle ?', message: 'Les parties déjà créées conservent leur copie du rôle.', confirmLabel: 'Supprimer', destructive: true })) {
                try {
                  await deleteCustomRole(r.id);
                  toast('Rôle supprimé');
                  router.back();
                } catch (e) {
                  toast((e as Error).message, 'error');
                }
              }
            }}
            testID="delete-custom"
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  field: { gap: 2, paddingVertical: 2 },
  row: { flexDirection: 'row', gap: spacing.md },
});
