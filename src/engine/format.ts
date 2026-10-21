import { phaseLabel, roleName } from './selectors';
import type { BallotOutcome, DeathCause, GameAction, GameEvent, GameState, LogEntry, PlayerId, StepKind, Winner } from './types';

/** Formatage des événements en français (pur, réutilisé par l'UI et les tests). */

export const DEATH_CAUSE_LABELS: Record<DeathCause, string> = {
  wolves: 'dévoré(e) par les loups',
  'big-bad-wolf': 'dévoré(e) par le Grand Méchant Loup',
  'white-wolf': 'dévoré(e) par le Loup-Garou blanc',
  poison: 'empoisonné(e) par la Sorcière',
  hunter: 'abattu(e) par le Chasseur',
  heartbreak: 'mort(e) de chagrin',
  vote: 'éliminé(e) par le vote du village',
  scapegoat: 'sacrifié(e) comme Bouc émissaire',
  'rusty-sword': 'mort(e) du tétanos (épée rouillée)',
  'custom-kill': 'éliminé(e) par un pouvoir nocturne',
  mj: 'éliminé(e) par le MJ',
};

export const WINNER_LABELS: Record<Winner, string> = {
  village: 'Le Village',
  wolves: 'Les Loups-Garous',
  lovers: 'Les Amoureux',
  piper: 'Le Joueur de flûte',
  'white-wolf': 'Le Loup-Garou blanc',
  angel: 'L’Ange',
  sectarian: 'L’Abominable sectaire',
  none: 'Personne',
  abandoned: 'Partie interrompue',
};

export const STEP_TITLES: Record<StepKind, string> = {
  thief: 'Le Voleur',
  comedian: 'Le Comédien',
  wolfhound: 'Le Chien-loup',
  cupid: 'Cupidon',
  lovers: 'Les Amoureux',
  'wild-child': 'L’Enfant sauvage',
  sisters: 'Les Deux Sœurs',
  brothers: 'Les Trois Frères',
  salvateur: 'Le Salvateur',
  seer: 'La Voyante',
  fox: 'Le Renard',
  wolves: 'Les Loups-Garous',
  infect: 'L’Infect Père des Loups',
  'white-wolf': 'Le Loup-Garou blanc',
  'big-bad-wolf': 'Le Grand Méchant Loup',
  witch: 'La Sorcière',
  piper: 'Le Joueur de flûte',
  charmed: 'Les joueurs charmés',
  raven: 'Le Corbeau',
  custom: 'Rôle personnalisé',
  bluff: 'Appel pour la forme',
};

export function nameOf(state: Pick<GameState, 'players'>, id: PlayerId | null | undefined): string {
  if (!id) return 'personne';
  return state.players.find((p) => p.id === id)?.name ?? 'joueur inconnu';
}

export function describeOutcome(state: Pick<GameState, 'players'>, o: BallotOutcome): string {
  switch (o.kind) {
    case 'elected':
      return `${nameOf(state, o.playerId)} est élu(e) maire.`;
    case 'eliminated':
      return o.viaScapegoat ? `Égalité : le Bouc émissaire ${nameOf(state, o.playerId)} est désigné.` : `${nameOf(state, o.playerId)} est désigné(e).`;
    case 'runoff':
      return `Égalité entre ${o.candidates.map((c) => nameOf(state, c)).join(', ')} : second tour.`;
    case 'mayor-tiebreak':
      return `Égalité entre ${o.candidates.map((c) => nameOf(state, c)).join(', ')} : le maire tranche.`;
    case 'mj-tiebreak':
      return `Égalité entre ${o.candidates.map((c) => nameOf(state, c)).join(', ')} : le MJ départage.`;
    case 'none':
      return o.reason === 'no-votes' ? 'Aucune voix : personne n’est désigné.' : 'Égalité persistante : personne n’est désigné.';
  }
}

/**
 * Description d'un événement. Avec `hideSecrets`, les rôles et les actions
 * nocturnes sont masqués (vue partageable).
 */
export function describeEvent(state: GameState, e: GameEvent, hideSecrets = false): string {
  const n = (id: PlayerId | null | undefined) => nameOf(state, id);
  const r = (id: Parameters<typeof roleName>[1]) => (hideSecrets ? 'rôle masqué' : roleName(state, id));
  switch (e.type) {
    case 'game-started':
      return 'Début de la partie.';
    case 'phase':
      return `${phaseLabel(e.phase)} commence.`;
    case 'step-done':
      return `${STEP_TITLES[e.kind]} : étape enregistrée.`;
    case 'thief-swap':
      return `Le Voleur (${n(e.playerId)}) prend la carte ${r(e.to)}.`;
    case 'lovers':
      return `Cupidon unit ${n(e.lovers[0])} et ${n(e.lovers[1])}.`;
    case 'wolfhound':
      return `Le Chien-loup (${n(e.playerId)}) choisit le camp ${e.team === 'wolves' ? 'des loups' : 'du village'}.`;
    case 'wild-model':
      return `L’Enfant sauvage (${n(e.playerId)}) choisit ${n(e.modelId)} comme modèle.`;
    case 'comedian-card':
      return `Le Comédien (${n(e.playerId)}) joue la carte ${r(e.roleId)}.`;
    case 'protected':
      return `${n(e.byId)} protège ${n(e.targetId)}.`;
    case 'attack-blocked': {
      const by = e.by === 'protection' ? 'la protection' : e.by === 'heal' ? 'la potion de vie' : 'la résistance de l’Ancien';
      return `Attaque contre ${n(e.targetId)} bloquée par ${by}.`;
    }
    case 'seer':
      return `La Voyante (${n(e.byId)}) découvre que ${n(e.targetId)} est ${r(e.roleId)}.`;
    case 'fox':
      return `Le Renard (${n(e.byId)}) flaire ${e.targetIds.map(n).join(', ')} : ${e.foundWolf ? 'un loup est présent' : 'aucun loup'}.`;
    case 'infected':
      return `${n(e.targetId)} est infecté(e) et rejoint les loups.`;
    case 'potion':
      return e.kind === 'heal' ? `La Sorcière sauve ${n(e.targetId)}.` : `La Sorcière empoisonne ${n(e.targetId)}.`;
    case 'charmed':
      return `Le Joueur de flûte charme ${e.targetIds.map(n).join(' et ')}.`;
    case 'raven':
      return `Le Corbeau désigne ${n(e.targetId)}.`;
    case 'custom-action':
      return `${n(e.byId)} cible ${n(e.targetId)} (${e.action === 'inspect' ? `rôle : ${r(state.players.find((p) => p.id === e.targetId)?.roleId ?? 'villageois')}` : 'marque'}).`;
    case 'death':
      return `${n(e.playerId)} (${r(e.roleId)}) est ${DEATH_CAUSE_LABELS[e.cause]}.`;
    case 'elder-life-lost':
      return `L’Ancien (${n(e.playerId)}) résiste à l’attaque et perd sa vie supplémentaire.`;
    case 'elder-vengeance':
      return `L’Ancien (${n(e.playerId)}) a été tué par le village : les villageois perdent leurs pouvoirs.`;
    case 'transformed':
      return e.reason === 'wild-child' ? `L’Enfant sauvage (${n(e.playerId)}) devient un loup.` : `${n(e.playerId)} se réveillera désormais avec les loups.`;
    case 'rusty-curse':
      return `Le loup ${n(e.wolfId)} est blessé par l’épée rouillée : il mourra la nuit prochaine.`;
    case 'bear':
      return e.growled ? 'L’ours du Montreur grogne !' : 'L’ours du Montreur reste silencieux.';
    case 'idiot-revealed':
      return `${n(e.playerId)} révèle être l’Idiot du village : épargné(e), il/elle ne votera plus.`;
    case 'mayor':
      if (e.how === 'removed') return 'Le village n’a plus de maire.';
      return e.how === 'elected' ? `${n(e.playerId)} est élu(e) maire.` : `${n(e.playerId)} devient maire par désignation.`;
    case 'ballot-opened':
      return e.round > 1 ? 'Second tour de scrutin ouvert.' : e.kind === 'mayor' ? 'Élection du maire ouverte.' : 'Vote d’élimination ouvert.';
    case 'ballot-closed':
      return `Scrutin clôturé. ${describeOutcome(state, e.outcome)}`;
    case 'ballot-cancelled':
      return 'Scrutin annulé.';
    case 'vote': {
      const target = e.op.target === 'blank' ? 'blanc' : e.op.target === 'abstain' ? 'abstention' : n(e.op.target);
      if (e.op.type === 'remove') return `Voix retirée (${target}).`;
      return e.op.voterId ? `Voix de ${n(e.op.voterId)} pour ${target}.` : `Voix pour ${target}.`;
    }
    case 'servant':
      return `La Servante dévouée (${n(e.servantId)}) prend le rôle de ${n(e.victimId)} : ${r(e.roleId)}.`;
    case 'scapegoat-voters':
      return e.voters.length ? `Votants autorisés au jour ${e.day} : ${e.voters.map(n).join(', ')}.` : `Personne ne pourra voter au jour ${e.day}.`;
    case 'angel-now-villager':
      return `L’Ange (${n(e.playerId)}) devient un simple villageois.`;
    case 'decision':
      return `Décision enregistrée${e.payload.target ? ` : ${n(e.payload.target)}` : ''}.`;
    case 'victory':
      return `Victoire : ${WINNER_LABELS[e.victory.winner]}. ${e.victory.reason}`;
    case 'note':
      return e.text;
  }
}

export function describeEntry(state: GameState, entry: LogEntry, hideSecrets = false): string {
  if (hideSecrets && entry.secret) return 'Action secrète (masquée).';
  return describeEvent(state, entry.event, hideSecrets);
}

/** Description courte d'une action déclarée par le MJ (vue « historique »). */
export function describeAction(state: Pick<GameState, 'players' | 'setup'>, a: GameAction): string {
  const n = (id: PlayerId | null | undefined) => nameOf(state, id);
  switch (a.type) {
    case 'night/submit': {
      const [kind] = a.stepKey.split(':');
      const title = STEP_TITLES[kind as StepKind] ?? kind;
      const p = a.payload;
      const parts: string[] = [];
      if (p.target !== undefined) parts.push(p.target ? n(p.target) : 'aucune cible');
      if (p.targets) parts.push(p.targets.map(n).join(' et ') || 'aucune cible');
      if (p.heal) parts.push(`sauve ${n(p.heal)}`);
      if (p.poison) parts.push(`empoisonne ${n(p.poison)}`);
      if (p.infect !== undefined) parts.push(p.infect ? 'infecte' : 'n’infecte pas');
      if (p.team) parts.push(p.team === 'wolves' ? 'camp des loups' : 'camp du village');
      if (p.cardIndex !== undefined) parts.push(p.cardIndex === null ? 'aucune carte' : `carte ${p.cardIndex + 1}`);
      if (p.littleGirlCaught) parts.push('Petite Fille surprise');
      return `${title} : ${parts.join(', ') || 'fait'}`;
    }
    case 'night/resolve':
      return 'Résolution de la nuit';
    case 'dawn/confirm':
      return 'Début du jour';
    case 'day/end':
      return 'La nuit tombe';
    case 'ballot/open':
      return a.kind === 'mayor' ? 'Ouverture de l’élection du maire' : 'Ouverture du vote d’élimination';
    case 'ballot/candidate':
      return `${a.add ? 'Candidature de' : 'Retrait de la candidature de'} ${n(a.playerId)}`;
    case 'ballot/vote':
      return `Voix${a.voterId ? ` de ${n(a.voterId)}` : ''} pour ${a.target === 'blank' ? 'blanc' : a.target === 'abstain' ? 'abstention' : n(a.target)}`;
    case 'ballot/unvote':
      return `Voix retirée${a.voterId ? ` (${n(a.voterId)})` : ''} : ${a.target === 'blank' ? 'blanc' : a.target === 'abstain' ? 'abstention' : n(a.target)}`;
    case 'ballot/close':
      return 'Clôture du scrutin';
    case 'ballot/reopen':
      return 'Réouverture du scrutin';
    case 'ballot/confirm':
      return 'Validation du scrutin';
    case 'ballot/cancel':
      return 'Annulation du scrutin';
    case 'judge/second-vote':
      return 'Second vote du Juge bègue';
    case 'decision/resolve':
      return `Décision : ${a.payload.target ? n(a.payload.target) : a.payload.targets ? a.payload.targets.map(n).join(', ') || 'personne' : a.payload.accept === undefined ? 'personne' : a.payload.accept ? 'acceptée' : 'refusée'}`;
    case 'mj/eliminate':
      return `Élimination manuelle de ${n(a.playerId)}`;
    case 'mj/note':
      return `Note : ${a.text}`;
    case 'game/finish':
      return 'Fin de la partie';
    case 'game/abandon':
      return 'Partie interrompue';
  }
}
