import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useTheme } from '@/theme/theme-context';
import { radius, spacing } from '@/theme/themes';
import { IconButton } from './button';
import { AppText } from './text';

/** Feuille modale ancrée en bas d'écran (sélections, détails). */
export function Sheet({ visible, title, subtitle, onClose, children, footer, testID }: { visible: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; testID?: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? "none" : "slide"} onRequestClose={onClose} statusBarTranslucent>
      {/* Le clavier iOS ne recouvre pas les champs de la feuille (note du MJ, nom d'une composition). */}
      <KeyboardAvoidingView style={[styles.backdrop, { backgroundColor: colors.overlay }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, paddingBottom: insets.bottom + spacing.md }]} testID={testID} accessibilityViewIsModal>
          <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
          <View style={styles.header}>
            <View style={styles.flex}>
              <AppText variant="title" accessibilityRole="header">
                {title}
              </AppText>
              {subtitle ? (
                <AppText variant="small" tone="muted">
                  {subtitle}
                </AppText>
              ) : null}
            </View>
            <IconButton icon="x" label="Fermer" onPress={onClose} testID="sheet-close" />
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: { maxHeight: '88%', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderBottomWidth: 0, paddingTop: spacing.sm, width: '100%', maxWidth: 640, alignSelf: 'center' },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.sm },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
});
