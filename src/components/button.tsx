import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/theme-context';
import { radius, spacing, TOUCH_MIN } from '@/theme/themes';
import { useHaptics } from '@/utils/haptics';
import { Icon, type IconName } from './icon';
import { AppText } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet';

interface ButtonProps {
  label: string;
  onPress: () => unknown;
  variant?: ButtonVariant;
  icon?: IconName;
  iconRight?: IconName;
  size?: 'md' | 'lg' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityHint?: string;
}

/** Délai pendant lequel un second appui est ignoré (prévention du double appui). */
const PRESS_GUARD_MS = 450;

/**
 * Bouton principal. Ignore les appuis répétés trop rapides et, si `onPress`
 * renvoie une promesse, reste désactivé jusqu'à sa résolution.
 */
export function Button({ label, onPress, variant = 'primary', icon, iconRight, size = 'md', disabled, loading, fullWidth, style, testID, accessibilityHint }: ButtonProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const lastPress = useRef(0);
  const [busy, setBusy] = useState(false);
  const inactive = disabled || loading || busy;

  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string; pressed: string }> = {
    primary: { bg: colors.accent, fg: colors.onAccent, border: colors.accent, pressed: colors.accentPressed },
    secondary: { bg: colors.surfaceRaised, fg: colors.text, border: colors.borderStrong, pressed: colors.surfacePressed },
    ghost: { bg: 'transparent', fg: colors.accent, border: 'transparent', pressed: colors.surfacePressed },
    danger: { bg: colors.danger, fg: colors.onDanger, border: colors.danger, pressed: colors.danger },
    quiet: { bg: colors.surface, fg: colors.textMuted, border: colors.border, pressed: colors.surfacePressed },
  };
  const p = palette[variant];
  const height = size === 'lg' ? 58 : size === 'sm' ? TOUCH_MIN : 50;

  const handle = () => {
    const now = Date.now();
    if (inactive || now - lastPress.current < PRESS_GUARD_MS) return;
    lastPress.current = now;
    haptics.tap();
    const r = onPress();
    if (r && typeof (r as Promise<unknown>).then === 'function') {
      setBusy(true);
      (r as Promise<unknown>).finally(() => setBusy(false));
    }
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!(loading || busy) }}
      onPress={handle}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        { minHeight: height, backgroundColor: pressed ? p.pressed : p.bg, borderColor: p.border, opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        size === 'sm' && styles.small,
        fullWidth && styles.full,
        style,
      ]}
    >
      {loading || busy ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} color={p.fg} size={size === 'sm' ? 18 : 20} /> : null}
          <AppText variant={size === 'sm' ? 'caption' : 'bodyStrong'} color={p.fg} numberOfLines={2} style={styles.label}>
            {label}
          </AppText>
          {iconRight ? <Icon name={iconRight} color={p.fg} size={18} /> : null}
        </View>
      )}
    </Pressable>
  );
}

interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'accent' | 'danger';
  active?: boolean;
  disabled?: boolean;
  size?: number;
  testID?: string;
}

export function IconButton({ icon, label, onPress, tone = 'default', active, disabled, size = TOUCH_MIN, testID }: IconButtonProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const fg = tone === 'accent' ? colors.accent : tone === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!active }}
      hitSlop={6}
      disabled={disabled}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconBtn,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: pressed || active ? colors.surfacePressed : colors.surface, borderColor: active ? colors.accent : colors.border, opacity: disabled ? 0.4 : 1 },
      ]}
    >
      <Icon name={icon} color={fg} size={Math.round(size * 0.46)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  small: { paddingHorizontal: spacing.md, borderRadius: radius.sm },
  full: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  label: { textAlign: 'center', flexShrink: 1 },
  iconBtn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
