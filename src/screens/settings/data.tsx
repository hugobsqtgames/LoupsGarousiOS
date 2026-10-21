import { useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { ToggleRow } from '@/components/controls';
import { useFeedback } from '@/components/feedback';
import { Panel, SectionTitle } from '@/components/panel';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useAppStore } from '@/state/app-store';
import { getRepository } from '@/state/services';
import { pickImportFile, shareExport } from '@/utils/data-transfer';
import { formatBytes } from '@/utils/format';

export function DataScreen() {
  const exportJson = useAppStore((s) => s.exportJson);
  const importJson = useAppStore((s) => s.importJson);
  const resetAll = useAppStore((s) => s.resetAll);
  const games = useAppStore((s) => s.games);
  const { confirm, toast, alert } = useFeedback();
  const [stats, setStats] = useState<{ games: number; bytes: number } | null>(null);
  const [withSettings, setWithSettings] = useState(false);

  useEffect(() => {
    getRepository()
      .then((r) => r.storageStats())
      .then(setStats)
      .catch(() => setStats(null));
  }, [games]);

  return (
    <Screen title="Données locales" subtitle="Tout est stocké sur cet appareil, dans une base SQLite. Rien n’est envoyé sur Internet." back>
      <Panel overline="Stockage">
        <AppText variant="body">{stats ? `${stats.games} partie(s) · ${formatBytes(stats.bytes)}` : 'Calcul…'}</AppText>
        <AppText variant="caption" tone="muted">
          Chaque action est enregistrée immédiatement, avec une copie de secours de la version précédente.
        </AppText>
      </Panel>
      <SectionTitle>Sauvegarde</SectionTitle>
      <Panel>
        <AppText variant="small" tone="muted">
          L’export produit un fichier JSON (parties, compositions, rôles personnalisés, paramètres) que vous pouvez conserver dans Fichiers ou transférer par AirDrop.
        </AppText>
        <Button
          label="Exporter les données"
          icon="upload"
          onPress={async () => {
            try {
              const json = await exportJson();
              await shareExport(json, `loups-garous-${new Date().toISOString().slice(0, 10)}.json`);
            } catch (e) {
              toast(`Export impossible : ${(e as Error).message}`, 'error');
            }
          }}
          testID="export-data"
        />
        <ToggleRow label="Importer aussi les paramètres" value={withSettings} onChange={setWithSettings} />
        <Button
          label="Importer un fichier"
          icon="download"
          variant="secondary"
          onPress={async () => {
            try {
              const text = await pickImportFile();
              if (text === null) return;
              const report = await importJson(text, withSettings);
              await alert(
                'Import réussi',
                `${report.games} partie(s), ${report.compositions} composition(s), ${report.customRoles} rôle(s) importé(s).${report.renamedGames ? ` ${report.renamedGames} partie(s) déjà présente(s) importée(s) en copie.` : ''}`,
              );
            } catch (e) {
              await alert('Import refusé', `${(e as Error).message}\n\nAucune donnée n’a été modifiée.`);
            }
          }}
          testID="import-data"
        />
      </Panel>
      <SectionTitle>Zone sensible</SectionTitle>
      <Panel tone="danger">
        <AppText variant="small" tone="muted">
          Efface toutes les parties, compositions, rôles personnalisés et paramètres. Pensez à exporter avant.
        </AppText>
        <Button
          label="Tout effacer"
          icon="trash"
          variant="danger"
          onPress={async () => {
            if (!(await confirm({ title: 'Tout effacer ?', message: 'Cette opération est irréversible.', confirmLabel: 'Continuer', destructive: true }))) return;
            if (!(await confirm({ title: 'Dernière confirmation', message: `${games.length} partie(s) seront définitivement supprimées.`, confirmLabel: 'Tout effacer', destructive: true }))) return;
            try {
              await resetAll();
              toast('Toutes les données ont été effacées');
            } catch (e) {
              toast(`Échec : ${(e as Error).message}`, 'error');
            }
          }}
          testID="reset-all"
        />
      </Panel>
    </Screen>
  );
}
