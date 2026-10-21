import { StyleSheet, View } from 'react-native';
import { VARIANT_OPTIONS, checkVariants, type Variants } from '@/engine';
import { Segmented, ToggleRow } from '@/components/controls';
import { Chip, Panel } from '@/components/panel';
import { AppText } from '@/components/text';
import { useTheme } from '@/theme/theme-context';
import { spacing } from '@/theme/themes';

/** Éditeur de variantes (réutilisé par les paramètres par défaut). */
export function VariantsEditor({ value, onChange }: { value: Variants; onChange: (v: Variants) => void }) {
  const { colors } = useTheme();
  const issues = checkVariants(value);
  return (
    <View style={styles.gap}>
      {issues.length > 0 ? (
        <Panel tone="warning">
          {issues.map((i, k) => (
            <AppText key={k} variant="small" tone={i.level === 'error' ? 'danger' : 'warning'}>
              {i.message}
            </AppText>
          ))}
        </Panel>
      ) : null}
      {VARIANT_OPTIONS.map((opt) => {
        const current = value[opt.key];
        return (
          <Panel key={opt.key} testID={`variant-${opt.key}`}>
            {opt.choices ? (
              <View style={styles.gapSm}>
                <View style={styles.head}>
                  <AppText variant="bodyStrong" style={styles.flex}>
                    {opt.label}
                  </AppText>
                  <Chip label={opt.official ? 'Officiel' : 'Variante'} color={opt.official ? colors.success : colors.textMuted} />
                </View>
                <AppText variant="small" tone="muted">
                  {opt.help}
                </AppText>
                <Segmented
                  value={current as string | number}
                  options={opt.choices.map((c) => ({ value: c.value as string | number, label: c.label }))}
                  onChange={(v) => onChange({ ...value, [opt.key]: v } as Variants)}
                  testID={`variant-${opt.key}-seg`}
                />
              </View>
            ) : (
              <ToggleRow label={opt.label} help={opt.help} value={current as boolean} onChange={(v) => onChange({ ...value, [opt.key]: v } as Variants)} testID={`variant-${opt.key}-toggle`} />
            )}
          </Panel>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  gapSm: { gap: spacing.sm },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
