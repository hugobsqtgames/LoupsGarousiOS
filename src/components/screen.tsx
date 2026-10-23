import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme-context';
import { spacing } from '@/theme/themes';
import { IconButton } from './button';
import { NightSky, type SkyMood } from './night-sky';
import { AppText } from './text';

interface ScreenProps {
  title?: string;
  overline?: string;
  subtitle?: string;
  children: ReactNode;
  /** Bouton retour (true = retour arrière de la pile). */
  back?: boolean | (() => void);
  right?: ReactNode;
  /** Zone d'actions fixée en bas, à portée de pouce. */
  footer?: ReactNode;
  scroll?: boolean;
  mood?: SkyMood;
  /** Largeur étendue (deux colonnes sur iPad / en paysage). */
  wide?: boolean;
  testID?: string;
}

/**
 * Gabarit commun : décor nocturne, en-tête, zones de sécurité (encoche,
 * Dynamic Island, indicateur d'accueil) et évitement du clavier.
 */
export function Screen({ title, overline, subtitle, children, back, right, footer, scroll = true, mood = 'night', wide = false, testID }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const sides = { paddingLeft: Math.max(insets.left, spacing.lg), paddingRight: Math.max(insets.right, spacing.lg) };
  const width = wide ? styles.wide : null;
  const onBack = typeof back === 'function' ? back : () => (router.canGoBack() ? router.back() : router.replace('/'));
  const header = (
    <View style={[styles.header, sides, { paddingTop: insets.top + spacing.sm }, title ? styles.headerWithTitle : null]}>
      <NightSky mood={mood} />
      <View style={styles.headerRow}>
        {back ? <IconButton icon="chevron-left" label="Retour" onPress={onBack} testID="back-button" /> : <View style={styles.headerSpacer} />}
        <View style={styles.headerActions}>{right}</View>
      </View>
      {title ? (
        <View style={styles.titleBlock}>
          {overline ? (
            <AppText variant="overline" tone="accent">
              {overline}
            </AppText>
          ) : null}
          <AppText variant="display" accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="small" tone="muted">
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: (footer ? spacing.lg : insets.bottom + spacing.xxl) }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {header}
      <View style={[styles.inner, sides, width]}>{children}</View>
    </ScrollView>
  ) : (
    <View style={styles.flex}>
      {header}
      <View style={[styles.inner, sides, width, styles.flex, styles.content]}>{children}</View>
    </View>
  );
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID={testID}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
        {footer ? (
          <View style={[styles.footer, sides, { paddingBottom: insets.bottom + spacing.md, borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <View style={[styles.footerInner, width]}>{footer}</View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.md, marginBottom: spacing.sm },
  headerWithTitle: { paddingBottom: 64 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  headerSpacer: { width: 44, height: 44 },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  titleBlock: { gap: spacing.xs, paddingTop: spacing.lg },
  content: { flexGrow: 1 },
  inner: { gap: spacing.md, width: '100%', maxWidth: 680, alignSelf: 'center' },
  wide: { maxWidth: 1180 },
  footerInner: { gap: spacing.sm, width: '100%', maxWidth: 680, alignSelf: 'center' },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
});
