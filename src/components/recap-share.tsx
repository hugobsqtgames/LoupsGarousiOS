import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { SvgXml } from 'react-native-svg';
import { recapSvg, type RecapData } from '@/art/recap';
import { sharePng } from '@/utils/share-image';
import { Button } from './button';
import { useFeedback } from './feedback';

type SvgHandle = { toDataURL: (cb: (base64: string) => void, options?: { width?: number; height?: number }) => void };

/**
 * Bouton « Partager le récapitulatif » : l'image est rendue hors écran,
 * convertie en PNG sur l'appareil (aucun service distant), puis confiée à la
 * feuille de partage.
 */
export function RecapShareButton({ data, fileName }: { data: RecapData; fileName: string }) {
  const ref = useRef<SvgHandle | null>(null);
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  const xml = recapSvg(data);

  const share = () =>
    new Promise<void>((resolve) => {
      const svg = ref.current;
      if (!svg) {
        toast('Image indisponible.', 'error');
        resolve();
        return;
      }
      setBusy(true);
      const timer = setTimeout(() => {
        setBusy(false);
        toast('La création de l’image a échoué.', 'error');
        resolve();
      }, 8000);
      try {
        svg.toDataURL(
          (base64) => {
            clearTimeout(timer);
            sharePng(base64, fileName)
              .catch((e: Error) => toast(`Partage impossible : ${e.message}`, 'error'))
              .finally(() => {
                setBusy(false);
                resolve();
              });
          },
          { width: 1080, height: 1350 },
        );
      } catch (e) {
        clearTimeout(timer);
        setBusy(false);
        toast(`Partage impossible : ${(e as Error).message}`, 'error');
        resolve();
      }
    });

  return (
    <View>
      <View style={styles.offscreen} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg ref={ref as never} width={540} height={675} viewBox="0 0 1080 1350">
          <SvgXml xml={xml} width={1080} height={1350} />
        </Svg>
      </View>
      <Button label="Partager le récapitulatif (image)" icon="share" variant="secondary" loading={busy} onPress={share} testID="share-recap" />
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', left: -10000, top: 0, width: 540, height: 675 },
});
