import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Écrit une image PNG (base64) dans le cache puis ouvre la feuille de partage du système. */
export async function sharePng(base64: string, fileName: string): Promise<void> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  await file.write(base64, { encoding: 'base64' });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Le partage n’est pas disponible sur cet appareil.');
  await Sharing.shareAsync(file.uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Partager le récapitulatif' });
}
