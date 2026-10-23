import { StyleSheet, View } from 'react-native';
import type { Reminder } from '@/engine';
import { useTheme } from '@/theme/theme-context';
import { spacing } from '@/theme/themes';
import { Icon } from './icon';
import { Panel } from './panel';
import { AppText } from './text';

/** Rappels contextuels pour le MJ (règles à ne pas oublier, effets en cours). */
export function RemindersPanel({ items, title = 'Rappels', testID }: { items: Reminder[]; title?: string; testID?: string }) {
  const { colors } = useTheme();
  if (items.length === 0) return null;
  const warn = items.some((i) => i.tone === 'warning');
  return (
    <Panel overline={title} tone={warn ? 'warning' : 'default'} testID={testID}>
      {items.map((r) => (
        <View key={r.id} style={styles.row} accessible accessibilityLabel={`Rappel : ${r.text}`}>
          <Icon name={r.tone === 'warning' ? 'alert' : 'info'} color={r.tone === 'warning' ? colors.warning : colors.info} size={16} />
          <AppText variant="small" tone={r.tone === 'warning' ? 'warning' : 'muted'} style={styles.flex}>
            {r.text}
          </AppText>
        </View>
      ))}
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
