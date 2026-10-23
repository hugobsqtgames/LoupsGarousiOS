import { useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useTheme } from '@/theme/theme-context';
import { radius, spacing } from '@/theme/themes';
import { useHaptics } from '@/utils/haptics';
import { Button } from './button';
import { Icon } from './icon';
import { AppText } from './text';

/**
 * Écran plein, opaque, pour montrer une information secrète à un seul joueur :
 *  1. « Passe le téléphone à X » ;
 *  2. X maintient l'appui pour révéler (un appui accidentel ne révèle rien) ;
 *  3. X cache l'information avant de rendre le téléphone.
 */
export function PrivateReveal({
  visible,
  playerName,
  instruction,
  onDone,
  doneLabel = 'J’ai vu · cacher',
  children,
  testID,
}: {
  visible: boolean;
  playerName: string;
  instruction?: string;
  onDone: () => void;
  doneLabel?: string;
  /** Contenu secret ; peut recevoir `hide()` pour cacher après un choix. */
  children: ReactNode | ((hide: () => void) => ReactNode);
  testID?: string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const reduceMotion = useReduceMotion();
  const [shown, setShown] = useState(false);
  const hide = () => {
    setShown(false);
    onDone();
  };
  return (
    <Modal visible={visible} animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={hide} statusBarTranslucent>
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]} testID={testID} accessibilityViewIsModal>
        {!shown ? (
          <View style={styles.center}>
            <Icon name="phone" color={colors.accent} size={48} />
            <AppText variant="overline" tone="accent" align="center">
              Écran privé
            </AppText>
            <AppText variant="display" align="center" accessibilityRole="header" testID="reveal-handoff">
              {`Passe le téléphone à ${playerName}`}
            </AppText>
            <AppText tone="muted" align="center">
              {instruction ?? 'Personne d’autre ne doit regarder l’écran.'}
            </AppText>
            <Pressable
              onLongPress={() => {
                haptics.success();
                setShown(true);
              }}
              delayLongPress={600}
              accessibilityRole="button"
              accessibilityLabel={`Je suis ${playerName} : maintenir pour révéler`}
              accessibilityHint="Maintenez l’appui pendant une demi-seconde."
              style={({ pressed }) => [styles.hold, { borderColor: colors.accent, backgroundColor: pressed ? colors.surfacePressed : colors.surfaceRaised }]}
              testID="reveal-hold"
            >
              <Icon name="eye" color={colors.accent} size={28} />
              <AppText variant="heading" align="center">{`Je suis ${playerName}`}</AppText>
              <AppText variant="small" tone="muted" align="center">
                Maintenir l’appui pour révéler
              </AppText>
            </Pressable>
            <Button label="Annuler" variant="quiet" size="sm" onPress={hide} testID="reveal-cancel" />
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.flex}>{typeof children === 'function' ? children(hide) : children}</View>
            <Button label={doneLabel} icon="eye-off" size="lg" onPress={hide} testID="reveal-done" />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, maxWidth: 520, alignSelf: 'center', width: '100%' },
  hold: { width: '100%', borderWidth: 2, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  content: { flex: 1, gap: spacing.lg, maxWidth: 560, alignSelf: 'center', width: '100%' },
  flex: { flex: 1 },
});
