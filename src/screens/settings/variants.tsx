import { DEFAULT_VARIANTS } from '@/engine';
import { Button } from '@/components/button';
import { useFeedback } from '@/components/feedback';
import { Screen } from '@/components/screen';
import { useAppStore } from '@/state/app-store';
import { VariantsEditor } from '@/screens/new-game/step-variants';

export function DefaultVariantsScreen() {
  const variants = useAppStore((s) => s.settings.defaultVariants);
  const update = useAppStore((s) => s.updateSettings);
  const { toast } = useFeedback();
  return (
    <Screen title="Variantes par défaut" subtitle="Préremplies à la création de chaque partie ; modifiables partie par partie." back>
      <VariantsEditor value={variants} onChange={(defaultVariants) => void update({ defaultVariants }).then((ok) => !ok && toast('Échec de l’enregistrement', 'error'))} />
      <Button label="Revenir aux valeurs d’origine" icon="refresh" variant="quiet" onPress={() => void update({ defaultVariants: DEFAULT_VARIANTS })} />
    </Screen>
  );
}
