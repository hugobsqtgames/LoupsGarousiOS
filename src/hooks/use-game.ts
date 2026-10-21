import { useCallback } from 'react';
import type { GameAction, GameState } from '@/engine';
import { useAudio } from '@/audio/audio-context';
import type { EffectName } from '@/audio/sounds';
import { useFeedback } from '@/components/feedback';
import { useGameStore } from '@/state/game-store';
import { useHaptics } from '@/utils/haptics';

/** État de la partie ouverte (jamais nul sous la porte de partie). */
export function useGameState(): GameState {
  const state = useGameStore((s) => s.state);
  if (!state) throw new Error('Aucune partie ouverte');
  return state;
}

/**
 * Envoi d'une action au moteur avec retour immédiat : son et vibration en cas
 * de succès, message explicite en cas de refus (l'état n'est alors pas modifié).
 */
export function useGameAction() {
  const dispatch = useGameStore((s) => s.dispatch);
  const { toast } = useFeedback();
  const audio = useAudio();
  const haptics = useHaptics();
  return useCallback(
    (action: GameAction, opts: { sound?: EffectName; success?: string } = {}): boolean => {
      const r = dispatch(action);
      if (!r.ok) {
        haptics.warning();
        toast(r.error, 'error');
        return false;
      }
      if (opts.sound) audio.play(opts.sound);
      if (opts.success) toast(opts.success);
      return true;
    },
    [dispatch, toast, audio, haptics],
  );
}

/** Annulation de la dernière action, avec confirmation. */
export function useUndo() {
  const undo = useGameStore((s) => s.undo);
  const record = useGameStore((s) => s.record);
  const { confirm, toast } = useFeedback();
  const audio = useAudio();
  return useCallback(async () => {
    if (!record || record.actions.length === 0) {
      toast('Rien à annuler.', 'info');
      return;
    }
    const ok = await confirm({ title: 'Annuler la dernière action ?', message: 'L’état de la partie sera recalculé sans cette action.', confirmLabel: 'Annuler l’action' });
    if (!ok) return;
    const r = undo();
    if (r.ok) {
      audio.play('undo');
      toast('Dernière action annulée', 'info');
    } else toast(r.error, 'error');
  }, [record, confirm, toast, undo, audio]);
}
