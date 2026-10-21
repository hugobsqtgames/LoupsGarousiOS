import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { describeAction, describeEntry, nameOf, type GameAction } from '@/engine';
import { useAudio } from '@/audio/audio-context';
import { Button, IconButton } from '@/components/button';
import { Segmented } from '@/components/controls';
import { useFeedback } from '@/components/feedback';
import { Panel } from '@/components/panel';
import { OptionGrid, playerOptions } from '@/components/player-picker';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { AppText } from '@/components/text';
import { useGameState, useUndo } from '@/hooks/use-game';
import { useGameStore } from '@/state/game-store';
import { useTheme } from '@/theme/theme-context';
import { spacing } from '@/theme/themes';
import { formatDate } from '@/utils/format';
import { toDashboard } from '@/utils/nav';

/** Action dont la cible peut être corrigée directement. */
function correctable(a: GameAction): boolean {
  if (a.type === 'night/submit') return a.payload.target !== undefined && a.payload.littleGirlCaught !== true;
  if (a.type === 'decision/resolve') return a.payload.target !== undefined && a.payload.targets === undefined;
  return false;
}

export function HistoryScreen() {
  const state = useGameState();
  const record = useGameStore((s) => s.record)!;
  const hide = useGameStore((s) => s.hideSecrets);
  const rewindTo = useGameStore((s) => s.rewindTo);
  const replace = useGameStore((s) => s.replace);
  const undo = useUndo();
  const audio = useAudio();
  const { confirm, toast, alert } = useFeedback();
  const { colors } = useTheme();
  const [view, setView] = useState<'events' | 'actions'>('events');
  const [editing, setEditing] = useState<number | null>(null);
  const actions = record.actions;
  const entries = useMemo(() => [...state.log].reverse(), [state.log]);

  const rewind = async (index: number) => {
    const dropped = actions.length - index;
    if (await confirm({ title: 'Revenir à ce point ?', message: `${dropped} action(s) seront supprimées de l’historique et l’état recalculé.`, confirmLabel: 'Revenir', destructive: true })) {
      const r = rewindTo(index);
      if (r.ok) {
        audio.play('undo');
        toast('Historique rétabli', 'info');
      } else toast(r.error, 'error');
    }
  };

  const applyCorrection = async (index: number, target: string | null) => {
    const a = actions[index].action;
    const next: GameAction = a.type === 'night/submit' ? { ...a, payload: { ...a.payload, target } } : a.type === 'decision/resolve' ? { ...a, payload: { ...a.payload, target } } : a;
    setEditing(null);
    const r = replace(index, next);
    if (r.ok) {
      toast('Action corrigée, partie recalculée');
      return;
    }
    if (r.failure.index === index) {
      await alert('Correction impossible', r.failure.message);
      return;
    }
    const ok = await confirm({
      title: 'Conséquences de la correction',
      message: `Cette correction rend invalide l’action n°${r.failure.index + 1} (« ${describeAction(state, r.failure.action)} ») : ${r.failure.message}\n\nSupprimer cette action et toutes les suivantes, puis appliquer la correction ?`,
      confirmLabel: 'Supprimer et corriger',
      destructive: true,
    });
    if (!ok) return;
    rewindTo(r.failure.index);
    const again = replace(index, next);
    if (again.ok) toast('Action corrigée, partie recalculée');
    else await alert('Correction impossible', again.failure.message);
  };

  const editingAction = editing !== null ? actions[editing]?.action : null;

  return (
    <Screen title="Historique" overline={`${actions.length} action(s) enregistrée(s)`} back right={<IconButton icon="undo" label="Annuler la dernière action" onPress={() => void undo()} disabled={actions.length === 0} testID="history-undo" />}>
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'events', label: 'Journal' },
          { value: 'actions', label: 'Actions du MJ' },
        ]}
        testID="history-view"
      />
      {view === 'events' ? (
        <Panel padded={false} testID="event-log">
          {entries.map((e) => (
            <View key={e.seq} style={[styles.row, { borderBottomColor: colors.border }]}>
              <AppText variant="caption" tone={e.event.type === 'death' ? 'danger' : 'faint'} style={styles.phase}>
                {e.phaseLabel}
              </AppText>
              <AppText variant="small" style={styles.flex} tone={e.event.type === 'death' ? 'danger' : e.event.type === 'phase' ? 'accent' : 'default'}>
                {describeEntry(state, e, hide)}
              </AppText>
            </View>
          ))}
        </Panel>
      ) : (
        <Panel padded={false} testID="action-log">
          {actions.length === 0 ? (
            <AppText variant="small" tone="muted" style={styles.pad}>
              Aucune action pour l’instant.
            </AppText>
          ) : null}
          {[...actions.keys()].reverse().map((i) => {
            const a = actions[i];
            const secret = hide && a.action.type === 'night/submit';
            return (
              <View key={i} style={[styles.actionRow, { borderBottomColor: colors.border }]} testID={`action-${i}`}>
                <View style={styles.flex}>
                  <AppText variant="caption" tone="faint">
                    n°{i + 1} · {formatDate(a.at)}
                  </AppText>
                  <AppText variant="small">{secret ? 'Action de nuit (masquée)' : describeAction(state, a.action)}</AppText>
                </View>
                {correctable(a.action) && !secret && state.phase.kind !== 'ended' ? <Button label="Corriger" size="sm" variant="quiet" onPress={() => setEditing(i)} testID={`correct-${i}`} /> : null}
                <Button label="Revenir ici" size="sm" variant="quiet" onPress={() => void rewind(i)} testID={`rewind-${i}`} />
              </View>
            );
          })}
        </Panel>
      )}
      <Button label="Tableau de bord" icon="home" variant="secondary" onPress={() => toDashboard(state.setup.id)} />
      <Sheet visible={editing !== null} title="Corriger la cible" subtitle={editingAction ? describeAction(state, editingAction) : undefined} onClose={() => setEditing(null)}>
        {editing !== null ? (
          <>
            <AppText variant="small" tone="muted">
              La partie sera rejouée depuis cette action. Les actions suivantes devenues impossibles vous seront signalées.
            </AppText>
            <OptionGrid options={playerOptions(state.players, { includeDead: true, sublabel: (p) => (p.alive ? undefined : 'éliminé(e) aujourd’hui') })} selected={[]} onSelect={(id) => void applyCorrection(editing, id)} testID="correct-grid" />
            <Button label="Aucune cible" variant="quiet" onPress={() => void applyCorrection(editing, null)} />
            <AppText variant="caption" tone="faint">
              Cible actuelle : {editingAction && 'payload' in editingAction ? nameOf(state, (editingAction.payload as { target?: string | null }).target) : '—'}
            </AppText>
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  phase: { width: 66 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});
