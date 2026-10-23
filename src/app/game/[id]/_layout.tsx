import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAudio } from '@/audio/audio-context';
import { Button } from '@/components/button';
import { AppText } from '@/components/text';
import { useAppStore } from '@/state/app-store';
import { resolveNightAmbience } from '@/settings/settings';
import { useGameStore } from '@/state/game-store';
import { useTheme } from '@/theme/theme-context';
import { spacing } from '@/theme/themes';

/** Charge la partie, pilote l'ambiance sonore et garde l'écran allumé pendant le jeu. */
export default function GameLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const open = useGameStore((s) => s.open);
  const gameId = useGameStore((s) => s.gameId);
  const loading = useGameStore((s) => s.loading);
  const loadError = useGameStore((s) => s.loadError);
  const phaseKind = useGameStore((s) => s.state?.phase.kind);
  const keepAwake = useAppStore((s) => s.settings.keepAwake);
  const nightScene = useAppStore((s) => resolveNightAmbience(s.settings));
  const dayAmbience = useAppStore((s) => s.settings.dayAmbience);
  const dawnBell = useAppStore((s) => s.settings.dawnBell);
  const audio = useAudio();
  const prevPhase = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (id) void open(id);
  }, [id, open]);

  useEffect(() => {
    if (!keepAwake) return;
    activateKeepAwakeAsync('game').catch(() => undefined);
    return () => {
      deactivateKeepAwake('game').catch(() => undefined);
    };
  }, [keepAwake]);

  useEffect(() => {
    if (!phaseKind) return;
    audio.setScene(phaseKind === 'night' || phaseKind === 'dawn' ? nightScene : phaseKind === 'day' && dayAmbience ? 'day' : 'none');
    if (prevPhase.current && prevPhase.current !== phaseKind) {
      if (phaseKind === 'night') audio.play('nightfall');
      else if (phaseKind === 'dawn') audio.play(dawnBell ? 'bell' : 'daybreak');
      else if (phaseKind === 'ended') audio.play('victory');
    }
    prevPhase.current = phaseKind;
  }, [phaseKind, audio, nightScene, dayAmbience, dawnBell]);

  useEffect(() => () => audio.setScene('none'), [audio]);

  if (loadError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <AppText variant="title" align="center">
          Partie illisible
        </AppText>
        <AppText tone="muted" align="center">
          {loadError}
        </AppText>
        <Button label="Retour à l’accueil" icon="home" onPress={() => router.replace('/')} />
      </View>
    );
  }
  if (loading || gameId !== id) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
        <AppText tone="muted">Ouverture de la partie…</AppText>
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="night" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
});
