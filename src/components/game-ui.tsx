import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { RoleDefinition, Team } from '@/engine';
import { useTheme } from '@/theme/theme-context';
import { radius, spacing, teamColor } from '@/theme/themes';
import type { SaveState } from '@/state/save-scheduler';
import { Icon, type IconName } from './icon';
import { AppText } from './text';

/** Médaillon de rôle : icône dans un anneau à la couleur du camp. */
export function RoleMedallion({ role, size = 44, hidden }: { role: Pick<RoleDefinition, 'icon' | 'team'>; size?: number; hidden?: boolean }) {
  const { colors } = useTheme();
  const c = hidden ? colors.textFaint : teamColor(colors, role.team);
  return (
    <View style={[styles.medallion, { width: size, height: size, borderRadius: size / 2, borderColor: c, backgroundColor: colors.surfaceRaised }]}>
      <Icon name={hidden ? 'lock' : (role.icon as IconName)} color={c} size={Math.round(size * 0.52)} />
    </View>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const s = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return s.toUpperCase();
}

export function PlayerAvatar({ name, alive = true, mayor, team, size = 44 }: { name: string; alive?: boolean; mayor?: boolean; team?: Team | null; size?: number }) {
  const { colors } = useTheme();
  const ring = team ? teamColor(colors, team) : colors.borderStrong;
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, borderColor: alive ? ring : colors.border, backgroundColor: alive ? colors.surfaceRaised : colors.surface }]}>
        {alive ? (
          <AppText variant="bodyStrong" tone="default">
            {initials(name)}
          </AppText>
        ) : (
          <Icon name="skull" color={colors.textFaint} size={Math.round(size * 0.5)} />
        )}
      </View>
      {mayor ? (
        <View style={[styles.crown, { backgroundColor: colors.accent }]}>
          <Icon name="crown" color={colors.onAccent} size={12} strokeWidth={2.2} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Texte secret : masqué tant que `peek` est faux. L'appui long qui le révèle
 * est géré par l'élément qui le contient (ligne de joueur) : un bouton imbriqué
 * dans un autre serait invisible pour VoiceOver et invalide sur le web.
 */
export function SecretText({ text, hidden, tone, peek = false }: { text: string; hidden: boolean; tone?: string; peek?: boolean }) {
  const { colors } = useTheme();
  if (!hidden) {
    return (
      <AppText variant="small" color={tone ?? colors.textMuted} numberOfLines={1}>
        {text}
      </AppText>
    );
  }
  return (
    <AppText variant="small" color={peek ? (tone ?? colors.textMuted) : colors.textFaint} numberOfLines={1} testID="secret-text">
      {peek ? text : '•••• rôle masqué'}
    </AppText>
  );
}

export function SaveIndicator({ save, onRetry }: { save: SaveState; onRetry: () => void }) {
  const { colors } = useTheme();
  if (save.status === 'error') {
    return (
      <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel={`Échec de la sauvegarde : ${save.error ?? ''}. Réessayer`} style={[styles.save, { borderColor: colors.danger }]} testID="save-indicator">
        <Icon name="alert" color={colors.danger} size={14} />
        <AppText variant="caption" tone="danger">
          Non enregistré · Réessayer
        </AppText>
      </Pressable>
    );
  }
  const label = save.status === 'saving' ? 'Enregistrement…' : save.status === 'saved' ? 'Enregistré' : '—';
  return (
    <View style={[styles.save, { borderColor: colors.border }]} accessibilityLabel={label} testID="save-indicator">
      <Icon name={save.status === 'saved' ? 'check' : 'save'} color={save.status === 'saved' ? colors.success : colors.textFaint} size={14} />
      <AppText variant="caption" tone="faint">
        {label}
      </AppText>
    </View>
  );
}

export function EmptyState({ icon, title, message, children }: { icon: IconName; title: string; message?: string; children?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Icon name={icon} color={colors.accent} size={30} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="small" tone="muted" align="center">
          {message}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  medallion: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatar: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  crown: { position: 'absolute', right: -4, top: -4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  save: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, minHeight: 28 },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
