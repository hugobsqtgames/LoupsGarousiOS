import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme-context';
import { radius, spacing } from '@/theme/themes';
import { Button } from './button';
import { Icon } from './icon';
import { AppText } from './text';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Masque le bouton d'annulation (simple information). */
  alertOnly?: boolean;
}

type ToastKind = 'success' | 'error' | 'info';

interface FeedbackApi {
  confirm(opts: ConfirmOptions): Promise<boolean>;
  alert(title: string, message?: string): Promise<void>;
  toast(message: string, kind?: ToastKind): void;
}

const FeedbackContext = createContext<FeedbackApi>({
  confirm: async () => false,
  alert: async () => undefined,
  toast: () => undefined,
});

/** Dialogues de confirmation et notifications éphémères, cohérents avec le thème. */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const [toastState, setToast] = useState<{ message: string; kind: ToastKind; id: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })), []);
  const alert = useCallback(async (title: string, message?: string) => {
    await new Promise<boolean>((resolve) => setDialog({ title, message, alertOnly: true, confirmLabel: 'Compris', resolve }));
  }, []);
  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, kind, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), kind === 'error' ? 4200 : 2200);
  }, []);
  const api = useMemo(() => ({ confirm, alert, toast }), [confirm, alert, toast]);

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };
  const toastColor = toastState?.kind === 'error' ? colors.danger : toastState?.kind === 'info' ? colors.info : colors.success;

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      {toastState ? (
        <View pointerEvents="box-none" style={[styles.toastWrap, { top: insets.top + spacing.sm }]}>
          <Pressable
            onPress={() => setToast(null)}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[styles.toast, { backgroundColor: colors.surfaceRaised, borderColor: toastColor }]}
            testID="toast"
          >
            <Icon name={toastState.kind === 'error' ? 'alert' : toastState.kind === 'info' ? 'info' : 'check'} color={toastColor} size={20} />
            <AppText variant="small" style={styles.flex}>
              {toastState.message}
            </AppText>
          </Pressable>
        </View>
      ) : null}
      <Modal visible={dialog !== null} transparent animationType="fade" onRequestClose={() => close(false)} statusBarTranslucent>
        <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
          <View style={[styles.dialog, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong }]} accessibilityViewIsModal testID="dialog">
            <AppText variant="title" accessibilityRole="header">
              {dialog?.title}
            </AppText>
            {dialog?.message ? (
              <AppText variant="body" tone="muted">
                {dialog.message}
              </AppText>
            ) : null}
            <View style={styles.actions}>
              {!dialog?.alertOnly ? <Button label={dialog?.cancelLabel ?? 'Annuler'} variant="secondary" onPress={() => close(false)} style={styles.flex} testID="dialog-cancel" /> : null}
              <Button label={dialog?.confirmLabel ?? 'Confirmer'} variant={dialog?.destructive ? 'danger' : 'primary'} onPress={() => close(true)} style={styles.flex} testID="dialog-confirm" />
            </View>
          </View>
        </View>
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackApi {
  return useContext(FeedbackContext);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  dialog: { width: '100%', maxWidth: 420, borderRadius: radius.xl, borderWidth: 1, padding: spacing.xl, gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  toastWrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center', zIndex: 1000 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, maxWidth: 520, width: '100%' },
});
