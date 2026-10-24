import { router } from 'expo-router';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';

/** Adresse inconnue (lien périmé, partie supprimée…) : retour explicite à l'accueil. */
export default function NotFound() {
  return (
    <Screen title="Page introuvable">
      <AppText tone="muted" testID="not-found">
        Cette page n’existe pas ou n’est plus disponible.
      </AppText>
      <Button label="Retour à l’accueil" icon="home" onPress={() => router.replace('/')} testID="not-found-home" />
    </Screen>
  );
}
