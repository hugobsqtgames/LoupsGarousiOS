import { Pressable, StyleSheet, View } from 'react-native';
import type { PlayerState } from '@/engine';
import { useTheme } from '@/theme/theme-context';
import { radius, spacing, TOUCH_MIN } from '@/theme/themes';
import { useHaptics } from '@/utils/haptics';
import { Icon } from './icon';
import { AppText } from './text';

export interface PickerOption {
  id: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
  disabledReason?: string;
}

/** Grille de sélection (joueurs, cartes…) aux grandes zones tactiles. */
export function OptionGrid({ options, selected, onSelect, testID, columns = 2 }: { options: PickerOption[]; selected: string[]; onSelect: (id: string) => void; testID?: string; columns?: 2 | 3 }) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  return (
    <View style={styles.grid} testID={testID}>
      {options.map((o) => {
        const active = selected.includes(o.id);
        return (
          <Pressable
            key={o.id}
            testID={testID ? `${testID}-${o.id}` : undefined}
            accessibilityRole="checkbox"
            accessibilityLabel={o.sublabel ? `${o.label}, ${o.sublabel}` : o.label}
            accessibilityHint={o.disabled ? o.disabledReason : undefined}
            accessibilityState={{ checked: active, disabled: !!o.disabled }}
            disabled={o.disabled}
            onPress={() => {
              haptics.tap();
              onSelect(o.id);
            }}
            style={({ pressed }) => [
              styles.cell,
              { flexBasis: columns === 3 ? '31%' : '47%', backgroundColor: active ? colors.accent : pressed ? colors.surfacePressed : colors.surface, borderColor: active ? colors.accent : colors.border, opacity: o.disabled ? 0.38 : 1 },
            ]}
          >
            <View style={styles.cellText}>
              <AppText variant="bodyStrong" color={active ? colors.onAccent : colors.text} numberOfLines={2}>
                {o.label}
              </AppText>
              {o.sublabel || (o.disabled && o.disabledReason) ? (
                <AppText variant="caption" color={active ? colors.onAccent : colors.textMuted} numberOfLines={1}>
                  {o.disabled && o.disabledReason ? o.disabledReason : o.sublabel}
                </AppText>
              ) : null}
            </View>
            {active ? <Icon name="check" color={colors.onAccent} size={18} strokeWidth={2.4} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Options de joueurs vivants (avec exclusions éventuelles). */
export function playerOptions(players: PlayerState[], opts: { includeDead?: boolean; exclude?: (p: PlayerState) => string | null; sublabel?: (p: PlayerState) => string | undefined } = {}): PickerOption[] {
  return players
    .filter((p) => opts.includeDead || p.alive)
    .map((p) => {
      const reason = opts.exclude?.(p) ?? null;
      return { id: p.id, label: p.name, sublabel: opts.sublabel?.(p), disabled: reason !== null, disabledReason: reason ?? undefined };
    });
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { flexGrow: 1, minHeight: TOUCH_MIN + 10, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cellText: { flex: 1, gap: 1 },
});
