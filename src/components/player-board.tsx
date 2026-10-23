import { router } from 'expo-router';
import type { GameState } from '@/engine';
import { Panel, SectionTitle } from './panel';
import { PlayerRow } from './player-row';

/** Plateau des joueurs (vivants puis éliminés), colonne de droite sur iPad / en paysage. */
export function PlayerBoard({ state, hide, testID }: { state: GameState; hide: boolean; testID?: string }) {
  const alive = state.players.filter((p) => p.alive);
  const dead = state.players.filter((p) => !p.alive);
  const open = (pid: string) => router.push({ pathname: '/game/[id]/player/[pid]', params: { id: state.setup.id, pid } });
  return (
    <>
      <SectionTitle>{`Joueurs en vie (${alive.length})`}</SectionTitle>
      <Panel padded={false} testID={testID}>
        {alive.map((p) => (
          <PlayerRow key={p.id} state={state} player={p} hideSecrets={hide} onPress={() => open(p.id)} testID={`board-${p.id}`} />
        ))}
      </Panel>
      {dead.length > 0 ? (
        <>
          <SectionTitle>{`Éliminés (${dead.length})`}</SectionTitle>
          <Panel padded={false}>
            {dead.map((p) => (
              <PlayerRow key={p.id} state={state} player={p} hideSecrets={hide} onPress={() => open(p.id)} testID={`board-${p.id}`} />
            ))}
          </Panel>
        </>
      ) : null}
    </>
  );
}
