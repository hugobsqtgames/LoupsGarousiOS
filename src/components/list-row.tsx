import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/theme-context';
import { spacing, TOUCH_MIN } from '@/theme/themes';
import { Icon, type IconName } from './icon';
import { AppText } from './text';

interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  testID?: string;
  danger?: boolean;
  disabled?: boolean;
}

export function ListRow({ title, subtitle, icon, iconColor, left, right, onPress, chevron = !!onPress, testID, danger, disabled }: ListRowProps) {
  const { colors } = useTheme();
  const body = (
    <>
      {left ?? (icon ? <Icon name={icon} color={iconColor ?? (danger ? colors.danger : colors.accent)} size={22} /> : null)}
      <View style={styles.text}>
        <AppText variant="bodyStrong" tone={danger ? 'danger' : 'default'} numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" tone="muted" numberOfLines={3}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {chevron ? <Icon name="chevron-right" color={colors.textFaint} size={18} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: disabled ? 0.45 : 1 }, pressed && { backgroundColor: colors.surfacePressed }]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: TOUCH_MIN + 12, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  text: { flex: 1, gap: 2 },
});
