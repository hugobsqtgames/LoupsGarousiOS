import { Pressable, StyleSheet, Switch, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/theme-context';
import { fonts, radius, spacing, TOUCH_MIN } from '@/theme/themes';
import { useHaptics } from '@/utils/haptics';
import { Icon } from './icon';
import { AppText } from './text';

/* ----------------------------- Interrupteur ----------------------------- */

export function ToggleRow({ label, help, value, onChange, testID, disabled }: { label: string; help?: string; value: boolean; onChange: (v: boolean) => void; testID?: string; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={help}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={[styles.toggleRow, { opacity: disabled ? 0.5 : 1 }]}
      testID={testID}
    >
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{label}</AppText>
        {help ? (
          <AppText variant="small" tone="muted">
            {help}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.surfacePressed, true: colors.accent }}
        thumbColor={value ? colors.onAccent : colors.textMuted}
        ios_backgroundColor={colors.surfacePressed}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

/* ------------------------------- Segments ------------------------------- */

export function Segmented<T extends string | number>({ options, value, onChange, testID }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; testID?: string }) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityRole="radiogroup" testID={testID}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ checked: active }}
            testID={testID ? `${testID}-${o.value}` : undefined}
            onPress={() => {
              haptics.tap();
              onChange(o.value);
            }}
            style={[styles.segment, active && { backgroundColor: colors.accent }]}
          >
            <AppText variant="caption" color={active ? colors.onAccent : colors.textMuted} numberOfLines={2} align="center">
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------ Compteur ------------------------------ */

export function Stepper({ value, min, max, onChange, label, testID }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string; testID?: string }) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const set = (v: number) => {
    if (v < min || v > max) return;
    haptics.tap();
    onChange(v);
  };
  return (
    <View style={styles.stepper} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value }} testID={testID}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => set(e.nativeEvent.actionName === 'increment' ? value + 1 : value - 1)}
    >
      <Pressable accessibilityRole="button" accessibilityLabel={`Diminuer ${label}`} onPress={() => set(value - 1)} disabled={value <= min} style={[styles.stepBtn, { borderColor: colors.borderStrong, opacity: value <= min ? 0.35 : 1 }]} testID={testID ? `${testID}-minus` : undefined}>
        <Icon name="minus" color={colors.text} />
      </Pressable>
      <AppText variant="number" style={styles.stepValue} align="center">
        {value}
      </AppText>
      <Pressable accessibilityRole="button" accessibilityLabel={`Augmenter ${label}`} onPress={() => set(value + 1)} disabled={value >= max} style={[styles.stepBtn, { borderColor: colors.borderStrong, opacity: value >= max ? 0.35 : 1 }]} testID={testID ? `${testID}-plus` : undefined}>
        <Icon name="plus" color={colors.text} />
      </Pressable>
    </View>
  );
}

/* ------------------------------- Volume ------------------------------- */

const STEPS = 10;

export function VolumeControl({ label, value, onChange, disabled, testID }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean; testID?: string }) {
  const { colors } = useTheme();
  const level = Math.round(value * STEPS);
  const set = (l: number) => onChange(Math.max(0, Math.min(STEPS, l)) / STEPS);
  return (
    <View style={[styles.volume, { opacity: disabled ? 0.45 : 1 }]} testID={testID}>
      <View style={styles.volumeHeader}>
        <AppText variant="bodyStrong">{label}</AppText>
        <AppText variant="caption" tone="muted">
          {level === 0 ? 'Coupé' : `${level * 10} %`}
        </AppText>
      </View>
      <View
        style={styles.volumeRow}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: level * 10, text: `${level * 10} %` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => set(e.nativeEvent.actionName === 'increment' ? level + 1 : level - 1)}
      >
        <Pressable disabled={disabled} accessibilityLabel={`Baisser ${label}`} accessibilityRole="button" onPress={() => set(level - 1)} style={styles.volBtn} testID={testID ? `${testID}-minus` : undefined}>
          <Icon name="minus" color={colors.textMuted} size={18} />
        </Pressable>
        <View style={styles.bars}>
          {Array.from({ length: STEPS }, (_, i) => (
            <Pressable
              key={i}
              disabled={disabled}
              accessibilityElementsHidden
              importantForAccessibility="no"
              onPress={() => set(i + 1 === level ? i : i + 1)}
              style={[styles.bar, { height: 10 + i * 2.4, backgroundColor: i < level ? colors.accent : colors.surfacePressed }]}
            />
          ))}
        </View>
        <Pressable disabled={disabled} accessibilityLabel={`Monter ${label}`} accessibilityRole="button" onPress={() => set(level + 1)} style={styles.volBtn} testID={testID ? `${testID}-plus` : undefined}>
          <Icon name="plus" color={colors.textMuted} size={18} />
        </Pressable>
      </View>
    </View>
  );
}

/* ----------------------------- Champ texte ----------------------------- */

export function TextField({ label, error, ...props }: TextInputProps & { label?: string; error?: string | null }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      {label ? (
        <AppText variant="caption" tone="muted">
          {label}
        </AppText>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.accent}
        keyboardAppearance="dark"
        accessibilityLabel={label ?? props.placeholder}
        {...props}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border, fontFamily: fonts.body }, props.style]}
      />
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: TOUCH_MIN + 8, paddingVertical: spacing.sm },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, padding: 3, gap: 3 },
  segment: { flex: 1, minHeight: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: { width: TOUCH_MIN + 4, height: TOUCH_MIN + 4, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 48 },
  volume: { gap: spacing.sm, paddingVertical: spacing.xs },
  volumeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  volBtn: { width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 36 },
  bar: { width: '8%', borderRadius: 3 },
  field: { gap: spacing.xs },
  input: { minHeight: TOUCH_MIN + 4, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, fontSize: 16 },
});
