import { router } from 'expo-router';
import { toHome } from '@/utils/nav';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { activeBallot, canOpenBallot, computeNightSteps, judgeCanCallSecondVote, nameOf, phaseLabel, reminders, WINNER_LABELS, type GameState } from '@/engine';
import { DebateTimer } from '@/components/debate-timer';
import { OptionGrid, playerOptions } from '@/components/player-picker';
import { RemindersPanel } from '@/components/reminders';
import { useAppStore } from '@/state/app-store';
import { EventsPanel, MjToolsSheet, type MjTool } from './events-panel';
import { Button, IconButton } from '@/components/button';
import { TextField } from '@/components/controls';
import { DecisionPanel } from '@/components/decision-panel';
import { useFeedback } from '@/components/feedback';
import { SaveIndicator } from '@/components/game-ui';
import { Icon } from '@/components/icon';
import { Panel, SectionTitle } from '@/components/panel';
import { PlayerRow } from '@/components/player-row';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { AppText } from '@/components/text';
import { useGameAction, useGameState, useUndo } from '@/hooks/use-game';
import { useGameStore } from '@/state/game-store';
import { useTheme } from '@/theme/theme-context';
import { spacing } from '@/theme/themes';

function go(state: GameState, path: 'night' | 'dawn' | 'vote' | 'history' | 'summary' | 'timeline' | 'table' | 'deal' | 'replay') {
  router.push({ pathname: `/game/[id]/${path}`, params: { id: state.setup.id } });
}

function PhaseCard({ state }: { state: GameState }) {
  const act = useGameAction();
  const debateMinutes = useAppStore((s) => s.settings.debateMinutes);
  const { confirm } = useFeedback();
  const ballot = activeBallot(state);

  if (state.phase.kind === 'ended' || state.victory) {
    const v = state.victory!;
    return (
      <Panel tone="accent" overline={state.phase.kind === 'ended' ? 'Partie terminée' : 'Condition de victoire atteinte'} title={`Victoire : ${WINNER_LABELS[v.winner]}`} testID="phase-card">
        <AppText variant="small" tone="muted">
          {v.reason}
        </AppText>
        {state.phase.kind === 'ended' ? (
          <Button label="Voir le résumé" icon="flag" onPress={() => go(state, 'summary')} testID="open-summary" />
        ) : (
          <>
            <AppText variant="caption" tone="faint">
              Si une règle extérieure à l’application s’applique encore, corrigez l’historique plutôt que de terminer.
            </AppText>
            <Button
              label="Terminer la partie"
              icon="flag"
              onPress={async () => {
                if (await confirm({ title: 'Terminer la partie ?', message: `${WINNER_LABELS[v.winner]} remporte la partie.`, confirmLabel: 'Terminer' })) {
                  if (act({ type: 'game/finish' })) go(state, 'summary');
                }
              }}
              testID="finish-game"
            />
          </>
        )}
      </Panel>
    );
  }

  if (state.phase.kind === 'night') {
    const steps = computeNightSteps(state);
    const done = steps.filter((s) => s.payload !== undefined).length;
    return (
      <Panel tone="accent" overline={phaseLabel(state.phase)} title="Le village dort" testID="phase-card">
        <AppText variant="small" tone="muted">
          {done === steps.length ? 'Toutes les étapes sont renseignées : résolvez la nuit.' : `${done} étape(s) sur ${steps.length} renseignée(s).`}
        </AppText>
        {state.setup.dealMode === 'phone' && state.actionCount === 0 ? (
          <Button label="Distribuer les rôles sur le téléphone" icon="phone" size="lg" onPress={() => go(state, 'deal')} testID="open-deal" />
        ) : null}
        <Button label={done === 0 ? 'Commencer la nuit' : 'Continuer la nuit'} icon="moon" size="lg" variant={state.setup.dealMode === 'phone' && state.actionCount === 0 ? 'secondary' : 'primary'} onPress={() => go(state, 'night')} testID="open-night" />
      </Panel>
    );
  }

  if (state.phase.kind === 'dawn') {
    const deaths = state.dawnReport.filter((e) => e.event.type === 'death').length;
    return (
      <Panel tone="accent" overline={phaseLabel(state.phase)} title="Le village se réveille" testID="phase-card">
        <AppText variant="small" tone="muted">
          {deaths === 0 ? 'Aucune victime cette nuit.' : `${deaths} victime(s) cette nuit.`} {state.pending.length ? 'Une décision est en attente.' : ''}
        </AppText>
        <Button label="Bilan de l’aube" icon="sunrise" size="lg" onPress={() => go(state, 'dawn')} testID="open-dawn" />
      </Panel>
    );
  }

  // Jour
  const mayorNeeded = state.setup.variants.mayorEnabled && !state.mayorId && canOpenBallot(state, 'mayor') === null;
  const canEliminate = canOpenBallot(state, 'elimination') === null;
  const ballotOpen = ballot && (ballot.status === 'open' || ballot.status === 'closed');
  return (
    <Panel tone="accent" overline={phaseLabel(state.phase)} title="Le village débat" testID="phase-card">
      {debateMinutes > 0 && !ballotOpen ? <DebateTimer key={`${state.dayNumber}-${debateMinutes}`} minutes={debateMinutes} testID="debate-timer" /> : null}
      {ballotOpen ? (
        <Button label={ballot.kind === 'mayor' ? 'Reprendre l’élection du maire' : 'Reprendre le vote'} icon="ballot" size="lg" onPress={() => go(state, 'vote')} testID="resume-ballot" />
      ) : (
        <>
          {mayorNeeded ? <Button label="Élire le maire" icon="crown" size="lg" onPress={() => go(state, 'vote')} testID="open-mayor" /> : null}
          {canEliminate ? (
            <Button label="Vote d’élimination" icon="ballot" size="lg" variant={mayorNeeded ? 'secondary' : 'primary'} onPress={() => router.push({ pathname: '/game/[id]/vote', params: { id: state.setup.id, kind: 'elimination' } })} testID="open-vote" />
          ) : null}
          {judgeCanCallSecondVote(state) ? (
            <Button
              label="Le Juge bègue impose un second vote"
              icon="gavel"
              variant="secondary"
              onPress={async () => {
                if (await confirm({ title: 'Second vote du Juge bègue ?', message: 'Utilisable une seule fois dans la partie.', confirmLabel: 'Déclencher' })) act({ type: 'judge/second-vote' }, { sound: 'alert' });
              }}
              testID="judge-vote"
            />
          ) : null}
          <Button
            label="La nuit tombe"
            icon="moon"
            variant={canEliminate || mayorNeeded ? 'quiet' : 'primary'}
            disabled={state.pending.length > 0}
            onPress={async () => {
              const msg = canEliminate ? 'Aucun vote d’élimination n’a eu lieu aujourd’hui.' : 'Le village s’endort.';
              if (await confirm({ title: 'Terminer la journée ?', message: msg, confirmLabel: 'La nuit tombe' })) {
                if (act({ type: 'day/end' })) go(state, 'night');
              }
            }}
            testID="end-day"
          />
        </>
      )}
    </Panel>
  );
}

/** Informations secrètes en cours (masquées avec les rôles). */
function SecretsPanel({ state, hide }: { state: GameState; hide: boolean }) {
  if (hide) return null;
  const items: string[] = [];
  if (state.lovers) items.push(`Amoureux : ${nameOf(state, state.lovers[0])} et ${nameOf(state, state.lovers[1])}.`);
  if (state.comedianCards.length) items.push(`Cartes du Comédien restantes : ${state.comedianCards.length}.`);
  const charmed = state.players.filter((p) => p.alive && p.charmed);
  if (charmed.length) items.push(`Charmés : ${charmed.map((p) => p.name).join(', ')}.`);
  if (items.length === 0) return null;
  return (
    <Panel overline="Secrets en cours" testID="effects-panel">
      {items.map((t) => (
        <AppText key={t} variant="small" tone="muted">
          • {t}
        </AppText>
      ))}
    </Panel>
  );
}

/** Rappels qui nomment un joueur lié à un secret : masqués avec les rôles. */
const SECRET_REMINDERS = new Set(['rusty', 'white-next', 'angel']);

export function GameDashboard() {
  const state = useGameState();
  const save = useGameStore((s) => s.save);
  const retrySave = useGameStore((s) => s.retrySave);
  const hide = useGameStore((s) => s.hideSecrets);
  const setHide = useGameStore((s) => s.setHideSecrets);
  const warnings = useGameStore((s) => s.warnings);
  const dismissWarnings = useGameStore((s) => s.dismissWarnings);
  const record = useGameStore((s) => s.record);
  const undo = useUndo();
  const act = useGameAction();
  const { colors } = useTheme();
  const [noteOpen, setNoteOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [tool, setTool] = useState<MjTool | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const generalReminders = reminders(state).filter((r) => !hide || !SECRET_REMINDERS.has(r.id));
  const [note, setNote] = useState('');
  const alive = state.players.filter((p) => p.alive);
  const dead = state.players.filter((p) => !p.alive);
  const showDecision = state.pending.length > 0 && state.phase.kind !== 'dawn';

  return (
    <Screen
      overline={state.phase.kind === 'ended' ? 'Partie terminée' : `${phaseLabel(state.phase)} · ${alive.length} en vie`}
      title={state.setup.name}
      back={toHome}
      mood={state.phase.kind === 'day' ? 'day' : state.phase.kind === 'dawn' ? 'dawn' : 'night'}
      right={
        <>
          <IconButton icon={hide ? 'eye-off' : 'eye'} label={hide ? 'Afficher les rôles' : 'Masquer les rôles'} onPress={() => setHide(!hide)} active={!hide} testID="toggle-secrets" />
          <IconButton icon="timeline" label="Chronologie" onPress={() => go(state, 'timeline')} testID="open-timeline" />
          <IconButton icon="table" label="Plan de table" onPress={() => go(state, 'table')} testID="open-table" />
          <IconButton icon="history" label="Historique" onPress={() => go(state, 'history')} testID="open-history" />
        </>
      }
      footer={
        state.phase.kind !== 'ended' ? (
          <View style={styles.footerRow}>
            <Button label="Annuler" icon="undo" variant="secondary" size="sm" onPress={() => void undo()} disabled={!record || record.actions.length === 0} style={styles.flex} testID="undo" />
            <Button label="Note MJ" icon="note" variant="secondary" size="sm" onPress={() => setNoteOpen(true)} style={styles.flex} testID="add-note" />
          </View>
        ) : undefined
      }
    >
      <View style={styles.saveRow}>
        <SaveIndicator save={save} onRetry={retrySave} />
      </View>
      {warnings.length > 0 ? (
        <Panel tone="warning" overline="Récupération de la sauvegarde" testID="load-warnings">
          {warnings.map((w) => (
            <AppText key={w} variant="small" tone="warning">
              {w}
            </AppText>
          ))}
          <Button label="J’ai compris" size="sm" variant="quiet" onPress={dismissWarnings} />
        </Panel>
      ) : null}
      <PhaseCard state={state} />
      {showDecision ? <DecisionPanel state={state} /> : null}
      <EventsPanel
        state={state}
        onTool={(t) => {
          setTool(t);
          setToolsOpen(true);
        }}
      />
      <RemindersPanel items={generalReminders} testID="reminders-panel" />
      <SecretsPanel state={state} hide={hide} />
      {state.phase.kind === 'day' || state.phase.kind === 'dawn' || state.setup.dealMode === 'phone' ? (
        <View style={styles.footerRow}>
          {state.phase.kind === 'day' || state.phase.kind === 'dawn' ? (
            <Button
              label="Outils du MJ"
              icon="sparkles"
              variant="secondary"
              size="sm"
              onPress={() => {
                setTool(null);
                setToolsOpen(true);
              }}
              style={styles.flex}
              testID="open-mj-tools"
            />
          ) : null}
          {state.setup.dealMode === 'phone' && state.phase.kind !== 'ended' ? <Button label="Revoir un rôle" icon="phone" variant="secondary" size="sm" onPress={() => setReviewOpen(true)} style={styles.flex} testID="review-role" /> : null}
        </View>
      ) : null}
      <SectionTitle right={hide ? <Icon name="lock" color={colors.textFaint} size={16} /> : undefined}>{`Joueurs en vie (${alive.length})`}</SectionTitle>
      <Panel padded={false}>
        {alive.map((p) => (
          <PlayerRow key={p.id} state={state} player={p} hideSecrets={hide} onPress={() => router.push({ pathname: '/game/[id]/player/[pid]', params: { id: state.setup.id, pid: p.id } })} testID={`player-${p.id}`} />
        ))}
      </Panel>
      {dead.length > 0 ? (
        <>
          <SectionTitle>{`Éliminés (${dead.length})`}</SectionTitle>
          <Panel padded={false}>
            {dead.map((p) => (
              <PlayerRow key={p.id} state={state} player={p} hideSecrets={hide} onPress={() => router.push({ pathname: '/game/[id]/player/[pid]', params: { id: state.setup.id, pid: p.id } })} testID={`player-${p.id}`} />
            ))}
          </Panel>
        </>
      ) : null}
      <MjToolsSheet
        state={state}
        visible={toolsOpen}
        tool={tool}
        onClose={() => {
          setToolsOpen(false);
          setTool(null);
        }}
      />
      <Sheet visible={reviewOpen} title="Revoir un rôle" subtitle="Le joueur verra son rôle actuel sur un écran privé." onClose={() => setReviewOpen(false)}>
        <OptionGrid
          options={playerOptions(state.players)}
          selected={[]}
          onSelect={(pid) => {
            setReviewOpen(false);
            router.push({ pathname: '/game/[id]/deal', params: { id: state.setup.id, pid } });
          }}
          testID="review-grid"
        />
      </Sheet>
      <Sheet
        visible={noteOpen}
        title="Note du MJ"
        subtitle="Ajoutée à l’historique de la partie."
        onClose={() => setNoteOpen(false)}
        footer={
          <Button
            label="Ajouter"
            icon="check"
            disabled={!note.trim()}
            onPress={() => {
              if (act({ type: 'mj/note', text: note }, { success: 'Note ajoutée' })) {
                setNote('');
                setNoteOpen(false);
              }
            }}
            testID="confirm-note"
          />
        }
      >
        <TextField value={note} onChangeText={setNote} placeholder="Ex. : règle maison appliquée…" multiline maxLength={500} autoFocus style={styles.noteInput} testID="note-input" />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footerRow: { flexDirection: 'row', gap: spacing.md },
  saveRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  noteInput: { minHeight: 100, textAlignVertical: 'top', paddingTop: spacing.md },
});
