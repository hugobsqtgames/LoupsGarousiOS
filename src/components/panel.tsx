import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/theme-context';
import { radius, spacing } from '@/theme/themes';
import { AppText } from './text';

interface PanelProps {
  children: ReactNode;
  title?: string;
  overline?: string;
  right?: ReactNode;
  tone?: 'default' | 'accent' | 'danger' | 'warning' | 'raised';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

/** Panneau de contenu : bordure fine, coins arrondis, en-tête optionnel. */
export function Panel({ children, title, overline, right, tone = 'default', onPress, style, padded = true, testID, accessibilityLabel }: PanelProps) {
  const { colors } = useTheme();
  const borderColor = tone === 'accent' ? colors.accent : tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.border;
  const bg = tone === 'raised' ? colors.surfaceRaised : colors.surface;
  const content = (
    <>
      {title || overline || right ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {overline ? (
              <AppText variant="overline" tone={tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'accent'}>
                {overline}
              </AppText>
            ) : null}
            {title ? <AppText variant="heading">{title}</AppText> : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </>
  );
  const s = [styles.panel, { backgroundColor: bg, borderColor }, padded && styles.padded, style];
  if (onPress) {
    return (
      <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} onPress={onPress} style={({ pressed }) => [...s, pressed && { backgroundColor: colors.surfacePressed }]}>
        {content}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={s}>
      {content}
    </View>
  );
}

export function Chip({ label, color, filled, testID }: { label: string; color?: string; filled?: boolean; testID?: string }) {
  const { colors } = useTheme();
  const c = color ?? colors.textMuted;
  return (
    <View testID={testID} style={[styles.chip, { borderColor: c, backgroundColor: filled ? c : 'transparent' }]}>
      <AppText variant="caption" color={filled ? colors.background : c} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="overline" tone="muted" accessibilityRole="header">
        {children}
      </AppText>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  padded: { padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  headerText: { flex: 1, gap: 2 },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  divider: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: spacing.xs },
});
