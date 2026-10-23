import { Cinzel_600SemiBold } from '@expo-google-fonts/cinzel/600SemiBold';
import { Cinzel_700Bold } from '@expo-google-fonts/cinzel/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AudioProvider } from '@/audio/audio-context';
import { expoAudioBackend } from '@/audio/expo-backend';
import { Button } from '@/components/button';
import { FeedbackProvider } from '@/components/feedback';
import { AppText } from '@/components/text';
import { useAppStore } from '@/state/app-store';
import { ThemeProvider, useTheme } from '@/theme/theme-context';
import { spacing } from '@/theme/themes';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Navigator() {
  const { colors, dark } = useTheme();
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: Platform.OS === 'ios' ? 'default' : 'fade',
          gestureEnabled: true,
        }}
      />
    </>
  );
}

function StartupError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <AppText variant="title" align="center">
        Impossible d’ouvrir les données locales
      </AppText>
      <AppText tone="muted" align="center">
        {message}
      </AppText>
      <Button label="Réessayer" icon="refresh" onPress={onRetry} />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Cinzel_600SemiBold, Cinzel_700Bold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const settings = useAppStore((s) => s.settings);
  const init = useAppStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  const ready = (fontsLoaded || fontError) && status !== 'loading';
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider themeId={settings.themeId} discreet={settings.discreetMode} highContrast={settings.highContrast}>
          <AudioProvider backend={expoAudioBackend}>
            <FeedbackProvider>
              {!ready ? null : status === 'error' ? <StartupError message={error ?? ''} onRetry={() => void init()} /> : <Navigator />}
            </FeedbackProvider>
          </AudioProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
});
