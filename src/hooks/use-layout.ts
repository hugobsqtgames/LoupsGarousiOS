import { useWindowDimensions } from 'react-native';

/**
 * Mise en page adaptée à la largeur disponible (iPad, paysage, Split View) :
 * deux colonnes au-delà de 900 points, ou 700 points en paysage.
 */
export function useWideLayout(): boolean {
  const { width, height } = useWindowDimensions();
  return width >= 900 || (width >= 700 && width > height);
}
