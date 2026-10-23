import { useState } from 'react';
import { aliveNeighbors, foxGroup, phaseLabel, roleName } from '@/engine';
import { IconButton } from '@/components/button';
import { Panel } from '@/components/panel';
import { Screen } from '@/components/screen';
import { SeatingCircle, type Seat } from '@/components/seating-circle';
import { AppText } from '@/components/text';
import { useGameState } from '@/hooks/use-game';
import { useGameStore } from '@/state/game-store';
import { toDashboard } from '@/utils/nav';

/**
 * Plan de table de la partie : voisins vivants (Renard, Montreur d'ours,
 * Chevalier). L'ordre des places se règle à la création de la partie.
 */
export function TableScreen() {
  const state = useGameState();
  const hide = useGameStore((s) => s.hideSecrets);
  const setHide = useGameStore((s) => s.setHideSecrets);
  const [selected, setSelected] = useState<string | null>(null);
  const players = [...state.players].sort((a, b) => a.seat - b.seat);
  const sel = selected ? state.players.find((p) => p.id === selected) : undefined;
  const nb = sel ? aliveNeighbors(state, sel.id) : { left: null, right: null };
  const group = sel && sel.alive ? foxGroup(state, sel.id) : [];
  const seats: Seat[] = players.map((p) => ({
    id: p.id,
    name: p.name,
    alive: p.alive,
    sub: hide ? undefined : roleName(state, p.roleId),
    tone: p.id === nb.left?.id || p.id === nb.right?.id ? 'accent' : null,
  }));
  const tamer = state.players.find((p) => p.alive && p.roleId === 'montreur-ours');
  const tamerNb = tamer ? aliveNeighbors(state, tamer.id) : null;

  return (
    <Screen
      overline={phaseLabel(state.phase)}
      title="Plan de table"
      back={() => toDashboard(state.setup.id)}
      right={<IconButton icon={hide ? 'eye-off' : 'eye'} label={hide ? 'Afficher les rôles' : 'Masquer les rôles'} onPress={() => setHide(!hide)} active={!hide} testID="table-secrets" />}
      testID="table-screen"
    >
      <AppText variant="small" tone="muted">
        Touchez un joueur pour voir ses voisins vivants. La place suivante (sens horaire) est son voisin de gauche.
      </AppText>
      <SeatingCircle seats={seats} selectedId={selected} onSelect={(id) => setSelected(selected === id ? null : id)} links={nb.left && sel ? [[sel.id, nb.left.id]].concat(nb.right ? [[sel.id, nb.right.id]] : []) as [string, string][] : []} testID="table-circle" />
      {sel ? (
        <Panel overline={`Place ${sel.seat + 1}`} title={sel.name} testID="table-detail">
          <AppText variant="small">Voisin de gauche (vivant) : {nb.left?.name ?? 'aucun'}</AppText>
          <AppText variant="small">Voisin de droite (vivant) : {nb.right?.name ?? 'aucun'}</AppText>
          {group.length ? (
            <AppText variant="small" tone="muted">
              Renard visant {sel.name} : groupe flairé {group.map((id) => state.players.find((p) => p.id === id)?.name).join(', ')}.
            </AppText>
          ) : null}
        </Panel>
      ) : null}
      {tamer && !hide && tamerNb ? (
        <Panel overline="Montreur d’ours">
          <AppText variant="small" tone="muted">
            {tamer.name} : voisins vivants {[tamerNb.left?.name, tamerNb.right?.name].filter(Boolean).join(' et ') || 'aucun'}.
          </AppText>
        </Panel>
      ) : null}
    </Screen>
  );
}
