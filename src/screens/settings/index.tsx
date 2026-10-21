import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAudio } from '@/audio/audio-context';
import { Button } from '@/components/button';
import { ToggleRow, VolumeControl } from '@/components/controls';
import { useFeedback } from '@/components/feedback';
import { Icon } from '@/components/icon';
import { ListRow } from '@/components/list-row';
import { Panel, SectionTitle } from '@/components/panel';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { THEME_IDS, type ThemeId } from '@/settings/settings';
import { useAppStore } from '@/state/app-store';
import { useTheme } from '@/theme/theme-context';
import { radius, spacing, THEMES } from '@/theme/themes';

function ThemeCard({ id, active, onPress }: { id: ThemeId; active: boolean; onPress: () => void }) {
  const t = THEMES[id];
  const { colors } = useTheme();
  const c = t.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={`Thème ${t.name}. ${t.description}`}
      accessibilityState={{ checked: active }}
      style={[styles.themeCard, { borderColor: active ? colors.accent : colors.border, backgroundColor: colors.surface }]}
      testID={`theme-${id}`}
    >
      <View style={[styles.swatch, { backgroundColor: c.background }]}>
        <View style={[styles.swatchMoon, { backgroundColor: c.moon }]} />
        <View style={[styles.swatchBar, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}>
          <View style={[styles.swatchDot, { backgroundColor: c.accent }]} />
          <View style={[styles.swatchLine, { backgroundColor: c.textMuted }]} />
        </View>
        <View style={styles.swatchTeams}>
          {[c.village, c.wolves, c.solo].map((x) => (
            <View key={x} style={[styles.swatchTeam, { backgroundColor: x }]} />
          ))}
        </View>
      </View>
      <View style={styles.themeText}>
        <View style={styles.inline}>
          <AppText variant="bodyStrong" style={styles.flex}>
            {t.name}
          </AppText>
          {active ? <Icon name="check" color={colors.accent} size={18} /> : null}
        </View>
        <AppText variant="caption" tone="muted" numberOfLines={2}>
          {t.description}
        </AppText>
      </View>
    </Pressable>
  );
}

export function SettingsScreen() {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const resetSettings = useAppStore((s) => s.resetSettings);
  const settingsError = useAppStore((s) => s.settingsError);
  const audio = useAudio();
  const { confirm, toast } = useFeedback();
  const set = async (patch: Parameters<typeof update>[0]) => {
    if (!(await update(patch))) toast('Le réglage n’a pas pu être enregistré.', 'error');
  };
  const soundOff = settings.muted || settings.discreetMode;

  return (
    <Screen title="Paramètres" back>
      {settingsError ? (
        <Panel tone="danger">
          <AppText variant="small" tone="danger">
            Dernier enregistrement échoué : {settingsError}
          </AppText>
        </Panel>
      ) : null}
      <SectionTitle>Apparence</SectionTitle>
      <View style={styles.themes} accessibilityRole="radiogroup">
        {THEME_IDS.map((id) => (
          <ThemeCard key={id} id={id} active={settings.themeId === id} onPress={() => void set({ themeId: id })} />
        ))}
      </View>
      <Panel>
        <ToggleRow
          label="Mode discret"
          help="Interface très sombre et sans aucun son, pour mener la nuit sans attirer l’attention."
          value={settings.discreetMode}
          onChange={(discreetMode) => void set({ discreetMode })}
          testID="discreet-toggle"
        />
      </Panel>

      <SectionTitle>Son</SectionTitle>
      <Panel testID="audio-panel">
        <ToggleRow label="Couper tous les sons" value={settings.muted} onChange={(muted) => void set({ muted })} testID="mute-toggle" />
        {settings.discreetMode ? (
          <AppText variant="caption" tone="warning">
            Le mode discret coupe le son tant qu’il est actif.
          </AppText>
        ) : null}
        <VolumeControl label="Ambiances (nuit, village)" value={settings.ambientVolume} onChange={(ambientVolume) => void set({ ambientVolume })} disabled={soundOff} testID="vol-ambient" />
        <VolumeControl label="Effets sonores" value={settings.effectsVolume} onChange={(effectsVolume) => void set({ effectsVolume })} disabled={soundOff} testID="vol-effects" />
        <ToggleRow
          label="Narration des appels de nuit"
          help="Lit à voix haute les phrases du MJ avec la voix française de l’appareil (hors ligne). Aucun nom ni secret n’est prononcé."
          value={settings.narrationEnabled}
          onChange={(narrationEnabled) => void set({ narrationEnabled })}
          disabled={soundOff}
          testID="narration-toggle"
        />
        <VolumeControl label="Volume de la narration" value={settings.narrationVolume} onChange={(narrationVolume) => void set({ narrationVolume })} disabled={soundOff || !settings.narrationEnabled} testID="vol-narration" />
        <ToggleRow label="Jouer en mode silencieux" help="Par défaut, l’interrupteur silencieux de l’iPhone coupe les sons." value={settings.playInSilentMode} onChange={(playInSilentMode) => void set({ playInSilentMode })} />
        <View style={styles.inline}>
          <Button label="Tester un effet" icon="volume" size="sm" variant="secondary" onPress={() => audio.play('daybreak')} disabled={soundOff} />
          <Button label="Tester la voix" icon="play" size="sm" variant="secondary" onPress={() => audio.narrate('Le village s’endort. Loups-Garous, réveillez-vous.')} disabled={soundOff || !settings.narrationEnabled} />
        </View>
        {audio.lastError() ? (
          <AppText variant="caption" tone="warning">
            Problème audio : {audio.lastError()}
          </AppText>
        ) : null}
      </Panel>

      <SectionTitle>Pendant la partie</SectionTitle>
      <Panel>
        <ToggleRow label="Masquer les rôles par défaut" help="Les rôles restent cachés dans les vues générales ; maintenez l’appui pour les lire." value={settings.hideSecretsByDefault} onChange={(hideSecretsByDefault) => void set({ hideSecretsByDefault })} />
        <ToggleRow label="Retour haptique" value={settings.haptics} onChange={(haptics) => void set({ haptics })} />
        <ToggleRow label="Garder l’écran allumé" help="Pendant une partie uniquement." value={settings.keepAwake} onChange={(keepAwake) => void set({ keepAwake })} />
      </Panel>

      <SectionTitle>Règles et données</SectionTitle>
      <Panel padded={false}>
        <ListRow icon="book" title="Variantes par défaut" subtitle="Appliquées aux nouvelles parties" onPress={() => router.push('/settings/variants')} testID="open-variants" />
        <ListRow icon="save" title="Données locales" subtitle="Export, import, effacement" onPress={() => router.push('/settings/data')} testID="open-data" />
        <ListRow icon="help" title="Aide" subtitle="Fonctionnement de l’application" onPress={() => router.push('/help')} />
      </Panel>
      <Button
        label="Réinitialiser les paramètres"
        icon="refresh"
        variant="quiet"
        onPress={async () => {
          if (await confirm({ title: 'Réinitialiser les paramètres ?', message: 'Thème, sons et variantes par défaut reprendront leurs valeurs d’origine. Les parties ne sont pas touchées.', confirmLabel: 'Réinitialiser', destructive: true })) {
            if (await resetSettings()) toast('Paramètres réinitialisés');
          }
        }}
        testID="reset-settings"
      />
      <AppText variant="caption" tone="faint" align="center">
        Loups-Garous MJ {Constants.expoConfig?.version ?? ''} · hors ligne, sans compte ni publicité
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  themes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  themeCard: { flexBasis: '47%', flexGrow: 1, borderWidth: 1.5, borderRadius: radius.lg, overflow: 'hidden' },
  themeText: { padding: spacing.md, gap: 2 },
  swatch: { height: 84, padding: spacing.sm, justifyContent: 'flex-end', gap: 6 },
  swatchMoon: { position: 'absolute', right: 12, top: 10, width: 18, height: 18, borderRadius: 9 },
  swatchBar: { height: 22, borderRadius: 6, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6 },
  swatchDot: { width: 10, height: 10, borderRadius: 5 },
  swatchLine: { flex: 1, height: 4, borderRadius: 2, opacity: 0.6 },
  swatchTeams: { flexDirection: 'row', gap: 4 },
  swatchTeam: { width: 18, height: 6, borderRadius: 3 },
});
