import type { ErrorBoundaryProps } from 'expo-router';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * Écran de secours en cas d'erreur d'affichage. Volontairement autonome
 * (aucun fournisseur de thème) : il doit fonctionner même si l'erreur vient
 * de l'initialisation de l'application. Les parties sont enregistrées après
 * chaque action : rien n'est perdu.
 */
export function ErrorFallback({ error, retry, home = true }: ErrorBoundaryProps & { home?: boolean }) {
  return (
    <View style={styles.root} testID="error-fallback">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          Un problème est survenu
        </Text>
        <Text style={styles.body}>Cet écran n’a pas pu s’afficher. Vos parties sont enregistrées après chaque action : aucune donnée n’est perdue.</Text>
        <Text style={styles.detail} selectable>
          {error.message}
        </Text>
        <Pressable accessibilityRole="button" onPress={retry} style={[styles.button, styles.primary]} testID="error-retry">
          <Text style={styles.primaryLabel}>Réessayer</Text>
        </Pressable>
        {home ? (
          <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.button} testID="error-home">
            <Text style={styles.label}>Retour à l’accueil</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0e1220' },
  content: { padding: 24, paddingTop: 96, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { color: '#f3efe4', fontSize: 24, fontWeight: '700' },
  body: { color: '#c9c4b8', fontSize: 16, lineHeight: 22 },
  detail: { color: '#9a95a8', fontSize: 13, fontFamily: 'Courier' },
  button: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#5a5f7a', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primary: { backgroundColor: '#d9a441', borderColor: '#d9a441' },
  primaryLabel: { color: '#1a1306', fontSize: 16, fontWeight: '700' },
  label: { color: '#f3efe4', fontSize: 16, fontWeight: '600' },
});
