import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  activeBallot,
  canOpenBallot,
  countBallot,
  describeOutcome,
  eligibleVoters,
  leadersOf,
  loverOf,
  nameOf,
  phaseLabel,
  talliesWithBonus,
  type Ballot,
  type BallotKind,
  type GameState,
  type PlayerId,
  type VoteMode,
} from '@/engine';
import { useAudio } from '@/audio/audio-context';
import { Button, IconButton } from '@/components/button';
import { Segmented } from '@/components/controls';
import { DecisionPanel } from '@/components/decision-panel';
import { useFeedback } from '@/components/feedback';
import { PlayerAvatar } from '@/components/game-ui';
import { Icon } from '@/components/icon';
import { Chip, Panel, SectionTitle } from '@/components/panel';
import { OptionGrid, playerOptions } from '@/components/player-picker';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { AppText } from '@/components/text';
import { useGameAction, useGameState } from '@/hooks/use-game';
import { useGameStore } from '@/state/game-store';
import { useTheme } from '@/theme/theme-context';
import { radius, spacing } from '@/theme/themes';
import { useHaptics } from '@/utils/haptics';
import { toDashboard } from '@/utils/nav';

/* ------------------------------------------------------------------ */
/* Ouverture d'un scrutin                                               */
/* ------------------------------------------------------------------ */

function OpenBallot({ state, kind }: { state: GameState; kind: BallotKind }) {
  const act = useGameAction();
  const [mode, setMode] = useState<VoteMode>(state.setup.variants.voteMode);
  const [candidates, setCandidates] = useState<PlayerId[]>([]);
  const reason = canOpenBallot(state, kind);
  const voters = eligibleVoters(state);
  const raven = kind === 'elimination' && state.ravenMark && state.ravenMark.day === state.dayNumber && state.eliminationsToday === 0 ? state.ravenMark.targetId : null;

  return (
    <View style={styles.gap}>
      <Panel overline={kind === 'mayor' ? 'Élection du maire' : 'Vote d’élimination'} title={kind === 'mayor' ? 'Le village choisit son maire' : 'Le village désigne un suspect'}>
        <AppText variant="small" tone="muted">
          {voters.length} votant(s) attendu(s).{' '}
          {kind === 'elimination' && state.mayorId ? `La voix du maire (${nameOf(state, state.mayorId)}) compte ${state.setup.variants.mayorVoteWeight === 2 ? 'double' : 'simple'}.` : ''}
        </AppText>
        {state.restrictedVoters && state.restrictedVoters.day === state.dayNumber ? (
          <AppText variant="small" tone="warning">
            Décision du Bouc émissaire : seuls {state.restrictedVoters.voters.map((v) => nameOf(state, v)).join(', ') || 'personne'} peuvent voter.
          </AppText>
        ) : null}
        {raven ? (
          <AppText variant="small" tone="warning">
            Le Corbeau ajoute {state.setup.variants.ravenBonus} voix contre {nameOf(state, raven)}.
          </AppText>
        ) : null}
        <AppText variant="overline" tone="muted">
          Saisie des votes
        </AppText>
        <Segmented<VoteMode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'tally', label: 'Compteur + / −' },
            { value: 'nominal', label: 'Qui vote pour qui' },
          ]}
          testID="vote-mode"
        />
      </Panel>
      {kind === 'mayor' ? (
        <Panel overline="Candidats" title="Qui se présente ?">
          <AppText variant="small" tone="muted">
            Sélectionnez les candidats déclarés. Sans sélection, tous les joueurs vivants sont éligibles.
          </AppText>
          <OptionGrid options={playerOptions(state.players)} selected={candidates} onSelect={(id) => setCandidates((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))} testID="candidate-grid" />
        </Panel>
      ) : null}
      {reason ? (
        <Panel tone="warning">
          <AppText variant="small" tone="warning">
            {reason}
          </AppText>
        </Panel>
      ) : null}
      <Button
        label={kind === 'mayor' ? 'Ouvrir l’élection' : 'Ouvrir le vote'}
        icon={kind === 'mayor' ? 'crown' : 'ballot'}
        size="lg"
        disabled={reason !== null}
        onPress={() => act({ type: 'ballot/open', kind, mode, candidates: kind === 'mayor' && candidates.length ? candidates : undefined }, { sound: 'confirm' })}
        testID="open-ballot"
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Tableau de bord du scrutin                                           */
/* ------------------------------------------------------------------ */

function Stat({ label, value, testID }: { label: string; value: string | number; testID?: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="number" testID={testID}>
        {value}
      </AppText>
      <AppText variant="caption" tone="muted" align="center">
        {label}
      </AppText>
    </View>
  );
}

function BallotStats({ state, ballot }: { state: GameState; ballot: Ballot }) {
  const { colors } = useTheme();
  const count = countBallot(ballot);
  const tallies = talliesWithBonus(ballot);
  const { leaders, top } = leadersOf(tallies);
  const remaining = Math.max(0, ballot.voters.length - count.cast);
  const total = Object.values(count.tallies).reduce((a, n) => a + n, 0);
  return (
    <Panel tone="raised" testID="ballot-stats">
      <View style={styles.stats}>
        <Stat label="votants attendus" value={ballot.voters.length} testID="stat-expected" />
        <Stat label="bulletins" value={count.cast} testID="stat-cast" />
        <Stat label="restants" value={remaining} testID="stat-remaining" />
        <Stat label="voix" value={total + (ballot.ravenTarget ? ballot.ravenBonus : 0)} testID="stat-total" />
      </View>
      <View style={[styles.leaderBar, { backgroundColor: leaders.length > 1 ? colors.warning : leaders.length ? colors.accent : colors.surfacePressed }]}>
        <Icon name={leaders.length > 1 ? 'alert' : 'crown'} color={leaders.length ? colors.onAccent : colors.textMuted} size={16} />
        <AppText variant="bodyStrong" color={leaders.length ? colors.onAccent : colors.textMuted} testID="leader-text">
          {leaders.length === 0 ? 'Aucune voix pour l’instant' : leaders.length === 1 ? `En tête : ${nameOf(state, leaders[0])} (${top})` : `Égalité : ${leaders.map((l) => nameOf(state, l)).join(', ')} (${top})`}
        </AppText>
      </View>
    </Panel>
  );
}

/** Résumé compact, toujours visible au-dessus du bouton de clôture. */
function LiveSummary({ state, ballot }: { state: GameState; ballot: Ballot }) {
  const { colors } = useTheme();
  const count = countBallot(ballot);
  const { leaders, top } = leadersOf(talliesWithBonus(ballot));
  const remaining = Math.max(0, ballot.voters.length - count.cast);
  const lead = leaders.length === 0 ? 'Aucune voix' : leaders.length === 1 ? `En tête : ${nameOf(state, leaders[0])} (${top})` : `Égalité (${top}) : ${leaders.map((l) => nameOf(state, l)).join(', ')}`;
  return (
    <View style={styles.live} accessibilityLiveRegion="polite" testID="live-summary">
      <AppText variant="caption" tone="muted">
        {count.cast}/{ballot.voters.length} bulletins · {remaining} restant(s)
      </AppText>
      <AppText variant="caption" color={leaders.length > 1 ? colors.warning : leaders.length ? colors.accent : colors.textMuted} numberOfLines={1} style={styles.liveLead}>
        {lead}
      </AppText>
    </View>
  );
}

function CountButton({ icon, label, onPress, disabled, testID }: { icon: 'plus' | 'minus'; label: string; onPress: () => void; disabled?: boolean; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.countBtn,
        { backgroundColor: icon === 'plus' ? (pressed ? colors.accentPressed : colors.accent) : pressed ? colors.surfacePressed : colors.surface, borderColor: icon === 'plus' ? colors.accent : colors.borderStrong, opacity: disabled ? 0.35 : 1 },
      ]}
      testID={testID}
    >
      <Icon name={icon} color={icon === 'plus' ? colors.onAccent : colors.text} size={26} strokeWidth={2.4} />
    </Pressable>
  );
}

function TallyBoard({ state, ballot }: { state: GameState; ballot: Ballot }) {
  const act = useGameAction();
  const audio = useAudio();
  const haptics = useHaptics();
  const { colors } = useTheme();
  const [mayorSheet, setMayorSheet] = useState(false);
  const count = countBallot(ballot);
  const tallies = talliesWithBonus(ballot);
  const { leaders } = leadersOf(tallies);
  const mayorVotes = ballot.kind === 'elimination' && state.mayorId && ballot.voters.includes(state.mayorId);
  const mayorChoice = state.mayorId ? count.byVoter[state.mayorId] : undefined;
  const capacity = ballot.voters.length - (mayorVotes ? 1 : 0);
  const anonymousCast = Object.values(count.anonymous).reduce((a, n) => a + n, 0);
  const full = state.setup.variants.strictVoterCount && anonymousCast >= capacity;

  const add = (target: PlayerId | 'blank') => {
    if (act({ type: 'ballot/vote', target })) {
      audio.play('vote');
      haptics.tap();
    }
  };
  const remove = (target: PlayerId | 'blank') => {
    if (act({ type: 'ballot/unvote', target })) audio.play('undo');
  };

  return (
    <View style={styles.gap}>
      {ballot.candidates.map((id) => {
        const p = state.players.find((x) => x.id === id)!;
        const anon = count.anonymous[id] ?? 0;
        const value = tallies[id] ?? 0;
        const isLeader = leaders.includes(id);
        const tie = isLeader && leaders.length > 1;
        const extra: string[] = [];
        if (ballot.ravenTarget === id) extra.push(`+${ballot.ravenBonus} Corbeau`);
        if (mayorChoice === id) extra.push(`+${state.setup.variants.mayorVoteWeight} maire`);
        return (
          <View key={id} style={[styles.voteRow, { backgroundColor: colors.surface, borderColor: tie ? colors.warning : isLeader ? colors.accent : colors.border }]} testID={`vote-row-${id}`}>
            <Pressable style={styles.voteMain} onPress={() => add(id)} disabled={full} accessibilityRole="button" accessibilityLabel={`Ajouter une voix pour ${p.name}, ${value} voix`} testID={`vote-tap-${id}`}>
              <PlayerAvatar name={p.name} mayor={state.mayorId === id} size={40} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {p.name}
                </AppText>
                <AppText variant="caption" tone={tie ? 'warning' : 'muted'}>
                  {[`${anon} bulletin(s)`, ...extra].join(' · ')}
                </AppText>
              </View>
              <AppText variant="number" style={styles.voteCount} tone={isLeader ? (tie ? 'warning' : 'accent') : 'default'} testID={`vote-count-${id}`}>
                {value}
              </AppText>
            </Pressable>
            <CountButton icon="minus" label={`Retirer une voix à ${p.name}`} onPress={() => remove(id)} disabled={anon === 0} testID={`vote-minus-${id}`} />
            <CountButton icon="plus" label={`Ajouter une voix à ${p.name}`} onPress={() => add(id)} disabled={full} testID={`vote-plus-${id}`} />
          </View>
        );
      })}
      {state.setup.variants.allowBlankVotes ? (
        <View style={[styles.voteRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.voteMain}>
            <Icon name="x" color={colors.textMuted} />
            <AppText variant="bodyStrong" style={styles.flex}>
              Votes blancs
            </AppText>
            <AppText variant="number" style={styles.voteCount} testID="blank-count">
              {count.anonymous.blank ?? 0}
            </AppText>
          </View>
          <CountButton icon="minus" label="Retirer un vote blanc" onPress={() => remove('blank')} disabled={(count.anonymous.blank ?? 0) === 0} testID="blank-minus" />
          <CountButton icon="plus" label="Ajouter un vote blanc" onPress={() => add('blank')} disabled={full} testID="blank-plus" />
        </View>
      ) : null}
      {full ? (
        <AppText variant="caption" tone="warning" align="center" testID="votes-full">
          Toutes les voix attendues sont enregistrées{mayorVotes && !mayorChoice ? ' (reste le vote du maire)' : ''}.
        </AppText>
      ) : null}
      {mayorVotes ? (
        <Panel tone={mayorChoice ? 'accent' : 'default'} testID="mayor-vote-panel">
          <View style={styles.inline}>
            <Icon name="crown" color={colors.accent} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">Vote du maire ({nameOf(state, state.mayorId)})</AppText>
              <AppText variant="caption" tone="muted">
                {mayorChoice ? `Pour ${mayorChoice === 'blank' ? 'blanc' : nameOf(state, mayorChoice)} · compte ×${state.setup.variants.mayorVoteWeight}` : `Compte ×${state.setup.variants.mayorVoteWeight}. À saisir séparément.`}
              </AppText>
            </View>
            <Button label={mayorChoice ? 'Changer' : 'Saisir'} size="sm" variant="secondary" onPress={() => setMayorSheet(true)} testID="mayor-vote" />
          </View>
        </Panel>
      ) : null}
      <Sheet visible={mayorSheet} title="Vote du maire" onClose={() => setMayorSheet(false)}
        footer={mayorChoice ? <Button label="Retirer le vote du maire" variant="quiet" icon="minus" onPress={() => { if (act({ type: 'ballot/unvote', target: mayorChoice, voterId: state.mayorId })) setMayorSheet(false); }} /> : undefined}
      >
        <OptionGrid
          options={ballot.candidates.map((id) => ({ id, label: nameOf(state, id), disabled: loverOf(state, state.mayorId ?? '') === id, disabledReason: 'Amoureux du maire' }))}
          selected={mayorChoice && mayorChoice !== 'blank' && mayorChoice !== 'abstain' ? [mayorChoice] : []}
          onSelect={(id) => {
            if (act({ type: 'ballot/vote', target: id, voterId: state.mayorId })) {
              audio.play('vote');
              setMayorSheet(false);
            }
          }}
          testID="mayor-vote-grid"
        />
      </Sheet>
    </View>
  );
}

function NominalBoard({ state, ballot }: { state: GameState; ballot: Ballot }) {
  const act = useGameAction();
  const audio = useAudio();
  const { colors } = useTheme();
  const count = countBallot(ballot);
  const tallies = talliesWithBonus(ballot);
  const { leaders } = leadersOf(tallies);
  const firstWithout = ballot.voters.find((v) => count.byVoter[v] === undefined) ?? null;
  const [voter, setVoter] = useState<PlayerId | null>(firstWithout);
  const current = voter ?? firstWithout;

  const cast = (target: PlayerId | 'blank' | 'abstain') => {
    if (!current) return;
    if (act({ type: 'ballot/vote', target, voterId: current })) {
      audio.play('vote');
      const next = ballot.voters.find((v) => v !== current && count.byVoter[v] === undefined) ?? null;
      setVoter(next);
    }
  };

  return (
    <View style={styles.gap}>
      <SectionTitle>{current ? `Vote de ${nameOf(state, current)}` : 'Tous les votants ont voté'}</SectionTitle>
      <View style={styles.wrap} testID="voter-chips">
        {ballot.voters.map((v) => {
          const has = count.byVoter[v] !== undefined;
          const active = v === current;
          return (
            <Pressable
              key={v}
              onPress={() => setVoter(v)}
              accessibilityRole="button"
              accessibilityLabel={`${nameOf(state, v)}${has ? ' a voté' : ''}`}
              accessibilityState={{ selected: active }}
              style={[styles.voterChip, { borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accent : has ? colors.surfaceRaised : colors.surface }]}
              testID={`voter-${v}`}
            >
              {has ? <Icon name="check" color={active ? colors.onAccent : colors.success} size={14} /> : null}
              <AppText variant="caption" color={active ? colors.onAccent : has ? colors.textMuted : colors.text}>
                {nameOf(state, v)}
                {v === state.mayorId && ballot.kind === 'elimination' ? ` ×${state.setup.variants.mayorVoteWeight}` : ''}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {ballot.candidates.map((id) => {
        const p = state.players.find((x) => x.id === id)!;
        const voters = Object.entries(count.byVoter)
          .filter(([, t]) => t === id)
          .map(([v]) => nameOf(state, v));
        const isLeader = leaders.includes(id);
        const blocked = current ? loverOf(state, current) === id : false;
        return (
          <Pressable
            key={id}
            disabled={!current || blocked}
            onPress={() => cast(id)}
            accessibilityRole="button"
            accessibilityLabel={`${current ? `${nameOf(state, current)} vote pour ` : ''}${p.name}, ${tallies[id] ?? 0} voix`}
            style={({ pressed }) => [styles.voteRow, { backgroundColor: pressed ? colors.surfacePressed : colors.surface, borderColor: isLeader ? (leaders.length > 1 ? colors.warning : colors.accent) : colors.border, opacity: blocked ? 0.4 : 1 }]}
            testID={`nominal-${id}`}
          >
            <PlayerAvatar name={p.name} mayor={state.mayorId === id} size={40} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{p.name}</AppText>
              <AppText variant="caption" tone="muted" numberOfLines={2}>
                {blocked ? 'Amoureux du votant' : voters.length ? voters.join(', ') : 'Aucun vote'}
                {ballot.ravenTarget === id ? ` · +${ballot.ravenBonus} Corbeau` : ''}
              </AppText>
            </View>
            <AppText variant="number" style={styles.voteCount} tone={isLeader ? 'accent' : 'default'} testID={`vote-count-${id}`}>
              {tallies[id] ?? 0}
            </AppText>
          </Pressable>
        );
      })}
      {current ? (
        <View style={styles.wrap}>
          {state.setup.variants.allowBlankVotes ? <Button label="Vote blanc" size="sm" variant="quiet" onPress={() => cast('blank')} testID="nominal-blank" /> : null}
          <Button label="Abstention" size="sm" variant="quiet" onPress={() => cast('abstain')} testID="nominal-abstain" />
          {count.byVoter[current] !== undefined ? (
            <Button label="Retirer son vote" size="sm" variant="quiet" icon="minus" onPress={() => act({ type: 'ballot/unvote', target: count.byVoter[current], voterId: current })} testID="nominal-clear" />
          ) : null}
        </View>
      ) : null}
      <AppText variant="caption" tone="faint">
        Blancs : {count.blank} · Abstentions : {count.abstentions}
      </AppText>
    </View>
  );
}

function ClosedBallot({ state, ballot }: { state: GameState; ballot: Ballot }) {
  const act = useGameAction();
  const { confirm } = useFeedback();
  const result = ballot.result!;
  const sorted = Object.entries(result.tallies).sort((a, b) => b[1] - a[1]);
  const o = result.outcome;
  const confirmLabel =
    o.kind === 'eliminated' ? `Valider : ${nameOf(state, o.playerId)} est désigné(e)` : o.kind === 'elected' ? `Valider : ${nameOf(state, o.playerId)} devient maire` : o.kind === 'runoff' ? 'Ouvrir le second tour' : o.kind === 'none' ? 'Valider le résultat' : 'Valider et départager';

  return (
    <View style={styles.gap}>
      <Panel tone="accent" overline="Scrutin clôturé" title={describeOutcome(state, o)} testID="ballot-result">
        {sorted.map(([id, v]) => (
          <View key={id} style={styles.resultRow}>
            <AppText variant="body" style={styles.flex}>
              {nameOf(state, id)}
            </AppText>
            <AppText variant="bodyStrong">{v}</AppText>
          </View>
        ))}
        <AppText variant="caption" tone="muted">
          Blancs : {result.blank} · Abstentions : {result.abstentions}
        </AppText>
      </Panel>
      <Button
        label={confirmLabel}
        icon={o.kind === 'eliminated' ? 'skull' : 'check'}
        variant={o.kind === 'eliminated' ? 'danger' : 'primary'}
        size="lg"
        onPress={async () => {
          const msg = o.kind === 'eliminated' ? `${nameOf(state, o.playerId)} sera éliminé(e) (sauf pouvoir particulier).` : describeOutcome(state, o);
          if (await confirm({ title: 'Valider le résultat ?', message: msg, confirmLabel: 'Valider', destructive: o.kind === 'eliminated' })) act({ type: 'ballot/confirm' }, { sound: 'confirm' });
        }}
        testID="confirm-ballot"
      />
      <View style={styles.row}>
        <Button label="Rouvrir pour corriger" icon="edit" variant="secondary" onPress={() => act({ type: 'ballot/reopen' })} style={styles.flex} testID="reopen-ballot" />
        <Button
          label="Annuler le scrutin"
          icon="x"
          variant="quiet"
          onPress={async () => {
            if (await confirm({ title: 'Annuler ce scrutin ?', message: 'Les voix saisies restent dans l’historique mais ne comptent pas.', confirmLabel: 'Annuler le scrutin', destructive: true })) act({ type: 'ballot/cancel' });
          }}
          style={styles.flex}
          testID="cancel-ballot"
        />
      </View>
    </View>
  );
}

export function VoteScreen() {
  const state = useGameState();
  const params = useLocalSearchParams<{ kind?: string }>();
  const act = useGameAction();
  const { confirm, toast } = useFeedback();
  const undo = useGameStore((s) => s.undo);
  const record = useGameStore((s) => s.record);
  const audio = useAudio();
  const ballot = activeBallot(state);
  const live = ballot && (ballot.status === 'open' || ballot.status === 'closed') ? ballot : null;
  const mayorPossible = canOpenBallot(state, 'mayor') === null;
  const [chosenKind, setChosenKind] = useState<BallotKind | null>(params.kind === 'elimination' ? 'elimination' : null);
  const kind: BallotKind = chosenKind === 'elimination' || !mayorPossible ? 'elimination' : 'mayor';
  // Dernier scrutin validé depuis cet écran (ou aujourd'hui si plus rien n'est possible) : on affiche son résultat.
  const [seenBallots] = useState(() => new Set(state.ballots.filter((b) => b.status === 'confirmed').map((b) => b.id)));
  const [dismissedDone, setDismissedDone] = useState<string | null>(null);
  const lastConfirmed = useMemo(() => [...state.ballots].reverse().find((b) => b.day === state.dayNumber && b.status === 'confirmed'), [state.ballots, state.dayNumber]);
  const nothingLeft = !mayorPossible && canOpenBallot(state, 'elimination') !== null;
  const confirmed = lastConfirmed && lastConfirmed.id !== dismissedDone && (!seenBallots.has(lastConfirmed.id) || nothingLeft) ? lastConfirmed : null;
  const openNext = (k: BallotKind) => {
    setChosenKind(k);
    setDismissedDone(lastConfirmed?.id ?? null);
  };
  const lastAction = record?.actions[record.actions.length - 1]?.action.type;
  const canUndoOp = lastAction === 'ballot/vote' || lastAction === 'ballot/unvote' || lastAction === 'ballot/candidate';

  const title = live ? (live.kind === 'mayor' ? (live.round > 1 ? 'Élection · 2ᵉ tour' : 'Élection du maire') : live.round > 1 ? 'Vote · 2ᵉ tour' : live.judgeSecondVote ? 'Second vote du Juge' : 'Vote d’élimination') : state.pending.length ? 'Décision' : kind === 'mayor' ? 'Élection du maire' : 'Vote d’élimination';

  return (
    <Screen
      overline={phaseLabel(state.phase)}
      title={title}
      mood="day"
      back={() => toDashboard(state.setup.id)}
      right={live ? <IconButton icon="undo" label="Annuler la dernière opération" disabled={!canUndoOp} onPress={() => { if (undo().ok) { audio.play('undo'); toast('Opération annulée', 'info'); } }} testID="undo-vote-op" /> : undefined}
      footer={
        live && live.status === 'open' ? (
          <>
          <LiveSummary state={state} ballot={live} />
          <Button
            label="Clôturer le scrutin"
            icon="lock"
            size="lg"
            onPress={async () => {
              const c = countBallot(live);
              const missing = live.voters.length - c.cast;
              const msg = missing > 0 ? `${missing} votant(s) n’ont pas encore voté. Clôturer quand même ?` : 'Tous les votes attendus sont enregistrés.';
              if (await confirm({ title: 'Clôturer le scrutin ?', message: msg, confirmLabel: 'Clôturer' })) act({ type: 'ballot/close' }, { sound: 'alert' });
            }}
            testID="close-ballot"
          />
          </>
        ) : undefined
      }
    >
      {state.phase.kind !== 'day' ? (
        <Panel>
          <AppText tone="muted">Les scrutins ont lieu pendant le jour.</AppText>
        </Panel>
      ) : live ? (
        <>
          {live.kind === 'mayor' && live.status === 'open' ? (
            <View style={styles.wrap}>
              <Chip label={`${live.candidates.length} candidat(s)`} />
            </View>
          ) : null}
          <BallotStats state={state} ballot={live} />
          {live.status === 'open' ? live.mode === 'tally' ? <TallyBoard state={state} ballot={live} /> : <NominalBoard state={state} ballot={live} /> : <ClosedBallot state={state} ballot={live} />}
        </>
      ) : state.pending.length > 0 ? (
        <DecisionPanel state={state} />
      ) : confirmed && confirmed.result ? (
        <View style={styles.gap}>
          <Panel tone="accent" overline="Scrutin validé" title={describeOutcome(state, confirmed.result.outcome)} testID="ballot-done">
            <AppText variant="small" tone="muted">
              Le résultat est enregistré dans l’historique.
            </AppText>
          </Panel>
          <Button label="Retour au tableau de bord" icon="home" onPress={() => toDashboard(state.setup.id)} testID="back-dashboard" />
          {mayorPossible ? <Button label="Élire le maire" icon="crown" variant="secondary" onPress={() => openNext('mayor')} /> : null}
          {canOpenBallot(state, 'elimination') === null ? <Button label="Vote d’élimination" icon="ballot" variant="secondary" onPress={() => openNext('elimination')} testID="goto-elimination" /> : null}
        </View>
      ) : (
        <OpenBallot state={state} kind={kind} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1, gap: 2 },
  leaderBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  voteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderRadius: radius.lg, padding: spacing.sm, paddingLeft: spacing.md },
  voteMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  voteCount: { minWidth: 40, textAlign: 'center' },
  countBtn: { width: 56, height: 56, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  voterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, minHeight: 40 },
  resultRow: { flexDirection: 'row', paddingVertical: 2 },
  live: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  liveLead: { flexShrink: 1, textAlign: 'right' },
});
