import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Écrit l'export dans le cache local puis ouvre la feuille de partage iOS (AirDrop, Fichiers…). */
export async function shareExport(json: string, fileName: string): Promise<void> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  await file.write(json);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Le partage de fichiers n’est pas disponible sur cet appareil.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Exporter les données' });
}

/** Ouvre le sélecteur de fichiers et renvoie le contenu texte, ou null si annulé. */
export async function pickImportFile(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'public.json', 'text/plain'], copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  if (asset.size !== undefined && asset.size > 20 * 1024 * 1024) throw new Error('Fichier trop volumineux (20 Mo maximum).');
  return new File(asset.uri).text();
}
