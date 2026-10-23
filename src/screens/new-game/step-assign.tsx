import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TEAM_LABELS, type RoleId } from '@/engine';
import { Button } from '@/components/button';
import { Segmented } from '@/components/controls';
import { RoleMedallion } from '@/components/game-ui';
import { Panel, SectionTitle } from '@/components/panel';
import { OptionGrid } from '@/components/player-picker';
import { Sheet } from '@/components/sheet';
import { AppText } from '@/components/text';
import { useRoleRegistry } from '@/hooks/use-roles';
import { draftDeal, needsGroups, remainingCards, rolesFromCounts } from '@/state/draft';
import { useAppStore } from '@/state/app-store';
import { useDraftStore } from '@/state/draft-store';
import { useTheme } from '@/theme/theme-context';
import { spacing } from '@/theme/themes';

export function StepAssign() {
  const draft = useDraftStore((s) => s.draft);
  const update = useDraftStore((s) => s.update);
  const { registry } = useRoleRegistry();
  const { colors } = useTheme();
  const [picking, setPicking] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const roles = rolesFromCounts(draft.roleCounts);
  const customRoles = useAppStore((s) => s.customRoles);
  const deal = draftDeal(draft);
  const preview = deal.assignments;
  const left = remainingCards(draft);
  const hasSect = needsGroups(roles, customRoles);
  const thiefDealt = Object.values(preview).includes('voleur');
  const drawn = draft.assignMode !== 'manual';

  const pickOptions = (playerId: string) => {
    const current = draft.assignments[playerId];
    const ids = (Object.keys(draft.roleCounts) as RoleId[]).filter((r) => (draft.roleCounts[r] ?? 0) > 0);
    return ids.map((r) => {
      const avail = (left[r] ?? 0) + (current === r ? 1 : 0);
      const def = registry.get(r);
      return { id: r, label: def.name, sublabel: `${avail} disponible(s) · ${TEAM_LABELS[def.team]}`, disabled: avail <= 0, disabledReason: 'Plus disponible' };
    });
  };

  return (
    <View style={styles.gap}>
      <Segmented<'random' | 'phone' | 'manual'>
        value={draft.assignMode}
        onChange={(assignMode) => update({ assignMode })}
        options={[
          { value: 'random', label: 'Tirage' },
          { value: 'phone', label: 'Sur le téléphone' },
          { value: 'manual', label: 'Cartes reçues' },
        ]}
        testID="assign-mode"
      />
      <Panel>
        <AppText variant="small" tone="muted">
          {draft.assignMode === 'random'
            ? 'L’application tire les rôles au sort. Distribuez ensuite les cartes physiques selon cette liste, sans la montrer aux joueurs.'
            : draft.assignMode === 'phone'
              ? 'Sans cartes : après le lancement, le téléphone passe de main en main et chaque joueur découvre son rôle en secret, puis le cache.'
              : 'Mélangez et distribuez les cartes physiques, puis indiquez la carte reçue par chaque joueur.'}
        </AppText>
        {roles.includes('voleur') && drawn ? (
          <AppText variant="small" tone="muted">
            Voleur (règle officielle) : les deux cartes supplémentaires sont mélangées au paquet ; les deux cartes restantes après la distribution vont au centre.
            {draft.assignMode === 'phone' ? ' Le Voleur les découvrira sur le téléphone pendant la première nuit.' : ''}
          </AppText>
        ) : null}
        <View style={styles.row}>
          <Button label={reveal ? 'Masquer les rôles' : 'Afficher les rôles'} icon={reveal ? 'eye-off' : 'eye'} variant="secondary" size="sm" onPress={() => setReveal((v) => !v)} testID="toggle-reveal-assign" />
          {drawn ? <Button label="Nouveau tirage" icon="dice" variant="quiet" size="sm" onPress={() => update((d) => ({ ...d, seed: (d.seed * 48271 + 11) % 2147483647 }))} testID="reroll" /> : null}
        </View>
      </Panel>
      {drawn && roles.includes('voleur') ? (
        <Panel testID="center-cards">
          <AppText variant="bodyStrong">Cartes au centre</AppText>
          <AppText variant="small" tone="muted">
            {thiefDealt
              ? reveal
                ? deal.centerCards.map((c) => registry.get(c).name).join(' · ')
                : 'Deux cartes masquées.'
              : 'Le Voleur n’a pas été distribué : il n’y a pas de cartes au centre.'}
          </AppText>
        </Panel>
      ) : null}

      <Panel padded={false}>
        {draft.players.map((p, i) => {
          const r = preview[p.id];
          const def = r && registry.has(r) ? registry.get(r) : null;
          const row = (
            <View style={[styles.assignRow, { borderBottomColor: colors.border }]}>
              <AppText variant="caption" tone="faint" style={styles.seat}>
                {i + 1}
              </AppText>
              {def ? <RoleMedallion role={def} size={36} hidden={!reveal} /> : <RoleMedallion role={{ icon: 'custom', team: 'village' }} size={36} hidden />}
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {p.name}
                </AppText>
                <AppText variant="caption" tone={def ? 'muted' : 'warning'}>
                  {def ? (reveal ? def.name : 'Rôle masqué') : 'Carte à saisir'}
                </AppText>
              </View>
              {draft.assignMode === 'manual' ? <Button label={def ? 'Changer' : 'Choisir'} size="sm" variant={def ? 'quiet' : 'primary'} onPress={() => setPicking(p.id)} testID={`assign-${i}`} /> : null}
            </View>
          );
          return <View key={p.id}>{row}</View>;
        })}
      </Panel>

      {hasSect ? (
        <>
          <SectionTitle>Groupes de l’Abominable sectaire</SectionTitle>
          <Panel>
            <AppText variant="small" tone="muted">
              Répartissez le village en deux groupes selon un critère visible (par exemple : côté de la table).
            </AppText>
            {draft.players.map((p, i) => (
              <View key={p.id} style={styles.sectRow}>
                <AppText variant="body" style={styles.flex} numberOfLines={1}>
                  {p.name}
                </AppText>
                <View style={styles.sectSeg}>
                  <Segmented<'A' | 'B'>
                    value={draft.sectGroups[p.id] ?? (i % 2 === 0 ? 'A' : 'B')}
                    onChange={(g) => update((d) => ({ ...d, sectGroups: { ...d.sectGroups, [p.id]: g } }))}
                    options={[
                      { value: 'A', label: 'Groupe A' },
                      { value: 'B', label: 'Groupe B' },
                    ]}
                  />
                </View>
              </View>
            ))}
          </Panel>
        </>
      ) : null}

      <Sheet visible={picking !== null} title="Carte reçue" subtitle={draft.players.find((p) => p.id === picking)?.name} onClose={() => setPicking(null)}>
        {picking ? (
          <OptionGrid
            options={pickOptions(picking)}
            selected={draft.assignments[picking] ? [draft.assignments[picking]] : []}
            onSelect={(id) => {
              update((d) => ({ ...d, assignments: { ...d.assignments, [picking]: id as RoleId } }));
              setPicking(null);
            }}
            testID="role-picker"
          />
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  flex: { flex: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  seat: { width: 20, textAlign: 'center' },
  assignRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  sectRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectSeg: { width: 200 },
});
