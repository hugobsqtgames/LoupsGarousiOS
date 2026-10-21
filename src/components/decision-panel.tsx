import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { nameOf, type GameState, type PendingDecision } from '@/engine';
import { useGameAction } from '@/hooks/use-game';
import { useRoleRegistry } from '@/hooks/use-roles';
import { spacing } from '@/theme/themes';
import { Button } from './button';
import { useFeedback } from './feedback';
import { Panel } from './panel';
import { OptionGrid, playerOptions } from './player-picker';
import { AppText } from './text';

function describe(state: GameState, d: PendingDecision, roleName: (id: string) => string): { title: string; help: string } {
  const n = (id: string) => nameOf(state, id);
  switch (d.kind) {
    case 'hunter-shot':
      return { title: `Le Chasseur ${n(d.playerId)} tire`, help: 'Il désigne immédiatement un joueur qui meurt avec lui.' };
    case 'custom-shot':
      return { title: `${n(d.playerId)} emporte un joueur`, help: `Effet au décès du rôle ${roleName(state.players.find((p) => p.id === d.playerId)?.roleId ?? '')}.` };
    case 'mayor-succession':
      return { title: `Succession du maire ${n(d.fromPlayerId)}`, help: 'Le maire mourant désigne son successeur.' };
    case 'scapegoat-voters':
      return { title: `Le Bouc émissaire ${n(d.playerId)} désigne les votants`, help: 'Choisissez qui pourra voter lors du prochain vote (aucun = personne).' };
    case 'mayor-tiebreak':
      return { title: 'Le maire tranche', help: 'Égalité : le maire désigne le joueur éliminé parmi les ex æquo.' };
    case 'mj-tiebreak':
      return { title: 'Départage de l’élection', help: 'Égalité persistante : le MJ départage les candidats.' };
    case 'servant-offer':
      return { title: 'Servante dévouée', help: `${n(d.servantId)} peut se révéler et prendre le rôle de ${n(d.victimId)} avant que sa carte ne soit montrée.` };
  }
}

/** Décision en attente (tir du Chasseur, succession…) : bloque la suite de la partie. */
export function DecisionPanel({ state }: { state: GameState }) {
  const d = state.pending[0];
  const act = useGameAction();
  const { confirm } = useFeedback();
  const { registry } = useRoleRegistry();
  const [selected, setSelected] = useState<string[]>([]);
  if (!d) return null;
  const { title, help } = describe(state, d, (id) => (registry.has(id as never) ? registry.get(id as never).name : id));
  const resolve = (payload: { target?: string | null; targets?: string[]; accept?: boolean }, label: string) => {
    if (act({ type: 'decision/resolve', decisionId: d.id, payload }, { sound: 'confirm', success: label })) setSelected([]);
  };

  const multi = d.kind === 'scapegoat-voters';
  const candidates = d.kind === 'mayor-tiebreak' || d.kind === 'mj-tiebreak' ? d.candidates : null;
  const exclude = (id: string) => {
    if (candidates && !candidates.includes(id)) return 'Non ex æquo';
    if ((d.kind === 'hunter-shot' || d.kind === 'custom-shot') && id === d.playerId) return 'Le tireur';
    return null;
  };
  const options = playerOptions(state.players, { exclude: (p) => exclude(p.id) }).filter((o) => !candidates || !o.disabled);

  return (
    <Panel tone="warning" overline={`Décision requise${state.pending.length > 1 ? ` · 1 / ${state.pending.length}` : ''}`} title={title} testID="decision-panel">
      <AppText variant="small" tone="muted">
        {help}
      </AppText>
      {d.kind === 'servant-offer' ? (
        <View style={styles.row}>
          <Button label="Elle refuse" variant="secondary" onPress={() => resolve({ accept: false }, 'La Servante ne se révèle pas')} style={styles.flex} testID="servant-refuse" />
          <Button label="Elle prend le rôle" onPress={() => resolve({ accept: true }, 'La Servante prend le rôle')} style={styles.flex} testID="servant-accept" />
        </View>
      ) : (
        <>
          <OptionGrid
            options={options}
            selected={selected}
            onSelect={(id) => setSelected((s) => (multi ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : s[0] === id ? [] : [id]))}
            testID="decision-grid"
          />
          <View style={styles.row}>
            {d.kind === 'hunter-shot' || d.kind === 'custom-shot' || d.kind === 'mayor-succession' ? (
              <Button
                label={d.kind === 'mayor-succession' ? 'Aucun successeur' : 'Personne'}
                variant="quiet"
                onPress={async () => {
                  if (await confirm({ title: 'Confirmer ?', message: d.kind === 'mayor-succession' ? 'Le village n’aura plus de maire.' : 'Aucun joueur ne sera abattu.' })) resolve({ target: null }, 'Décision enregistrée');
                }}
                style={styles.flex}
                testID="decision-none"
              />
            ) : null}
            <Button
              label="Valider"
              icon="check"
              disabled={!multi && selected.length === 0}
              onPress={async () => {
                const names = selected.map((id) => nameOf(state, id)).join(', ') || 'personne';
                if (await confirm({ title: 'Valider la décision ?', message: multi ? `Votants autorisés : ${names}.` : `Joueur désigné : ${names}.`, confirmLabel: 'Valider', destructive: d.kind === 'hunter-shot' || d.kind === 'custom-shot' || d.kind === 'mayor-tiebreak' })) {
                  resolve(multi ? { targets: selected } : { target: selected[0] }, 'Décision enregistrée');
                }
              }}
              style={styles.flex}
              testID="decision-confirm"
            />
          </View>
        </>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
