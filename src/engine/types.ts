/**
 * Types fondamentaux du moteur de règles.
 *
 * Le moteur est « event-sourced » : l'état d'une partie est toujours recalculé
 * à partir de sa configuration initiale (GameSetup) et de la liste ordonnée des
 * actions déclarées par le MJ (GameAction[]). Aucune donnée d'interface ici.
 */

export type Team = 'village' | 'wolves' | 'solo';

export type Expansion = 'base' | 'nouvelle-lune' | 'le-village' | 'personnages' | 'custom';

export type Certainty = 'officielle' | 'probable' | 'incertaine';

export type BuiltinRoleId =
  | 'villageois'
  | 'loup-garou'
  | 'voyante'
  | 'sorciere'
  | 'chasseur'
  | 'cupidon'
  | 'petite-fille'
  | 'voleur'
  | 'salvateur'
  | 'ancien'
  | 'bouc-emissaire'
  | 'idiot'
  | 'joueur-de-flute'
  | 'corbeau'
  | 'renard'
  | 'montreur-ours'
  | 'chevalier'
  | 'deux-soeurs'
  | 'trois-freres'
  | 'enfant-sauvage'
  | 'chien-loup'
  | 'servante'
  | 'juge-begue'
  | 'ange'
  | 'villageois-villageois'
  | 'loup-blanc'
  | 'grand-mechant-loup'
  | 'infect'
  | 'sectaire'
  | 'comedien'
  | 'gitane';

/** Identifiant d'un rôle personnalisé : toujours préfixé par « custom: ». */
export type CustomRoleId = `custom:${string}`;

export type RoleId = BuiltinRoleId | CustomRoleId;

export type PlayerId = string;

/* ------------------------------------------------------------------ */
/* Rôles personnalisés (déclaratifs, jamais de code exécuté)           */
/* ------------------------------------------------------------------ */

export type CustomNightAction = 'none' | 'inspect' | 'protect' | 'kill' | 'mark';
export type CustomSchedule = 'every_night' | 'first_night' | 'even_nights' | 'odd_nights';
export type CustomOnDeath = 'none' | 'shoot';
/**
 * Conditions de victoire des rôles personnalisés, calquées sur les règles
 * officielles : camp (Villageois / Loup-Garou), dernier survivant (Loup-Garou
 * blanc), tous les survivants marqués (Joueur de flûte), éliminé au premier
 * tour (Ange), groupe opposé éliminé (Abominable sectaire).
 */
export type CustomWinCondition = 'camp' | 'last-survivor' | 'all-marked' | 'first-round-death' | 'opposite-group';

export interface CustomRoleDef {
  id: CustomRoleId;
  name: string;
  team: Team;
  description: string;
  nightAction: CustomNightAction;
  schedule: CustomSchedule;
  /** null = illimité. */
  uses: number | null;
  canTargetSelf: boolean;
  onDeath: CustomOnDeath;
  /** Position dans l'ordre de la nuit (0–100, voir NIGHT_ORDER). */
  wakeOrder: number;
  /** Absent dans les anciens enregistrements : « camp » (village/loups) ou « dernier survivant » (solitaire). */
  winCondition?: CustomWinCondition;
}

/* ------------------------------------------------------------------ */
/* Variantes                                                           */
/* ------------------------------------------------------------------ */

export type MayorTieRule = 'runoff_then_mj' | 'mj_decides' | 'no_mayor';
export type EliminationTieRule = 'mayor_then_runoff' | 'runoff' | 'none';
export type MayorSuccessionRule = 'designate' | 'election';
export type ElderVengeance = 'village' | 'vote_only';
export type AngelWindow = 'first_round' | 'first_vote';
export type WildChildTrigger = 'any_death' | 'wolves_only';
export type VoteMode = 'tally' | 'nominal';
export type BigBadWolfRule = 'wolf_died' | 'wolf_or_ambiguous_died';
export type NightParity = 'even' | 'odd';

export interface Variants {
  /** Élection du maire (Capitaine) lors du premier jour. */
  mayorEnabled: boolean;
  /** Poids du vote du maire lors des votes d'élimination (2 = règle de base). */
  mayorVoteWeight: 1 | 2;
  mayorTie: MayorTieRule;
  mayorSuccession: MayorSuccessionRule;
  eliminationTie: EliminationTieRule;
  /** Le Bouc émissaire meurt en cas d'égalité (prioritaire sur le maire). */
  scapegoatOnTie: boolean;
  /** Mode de saisie par défaut des scrutins. */
  voteMode: VoteMode;
  allowBlankVotes: boolean;
  /** En mode compteur : interdit d'enregistrer plus de voix que de votants. */
  strictVoterCount: boolean;
  /** Appeler les rôles morts / inactifs pour ne rien révéler. */
  callInactiveRoles: boolean;
  /** Le Salvateur peut se protéger lui-même. */
  salvateurSelf: boolean;
  /** Le Salvateur ne peut protéger deux nuits de suite la même personne. */
  salvateurNoRepeat: boolean;
  /** La Sorcière peut se sauver elle-même. */
  witchSelfHeal: boolean;
  elderVengeance: ElderVengeance;
  angelWindow: AngelWindow;
  /** Avec l'Ange, la partie commence par un débat et un vote. */
  angelStartsWithDay: boolean;
  wildChildTrigger: WildChildTrigger;
  /** Cupidon gagne avec un couple mixte. */
  cupidWinsWithMixedLovers: boolean;
  /** La Servante dévouée peut prendre le rôle d'un joueur éliminé par le vote. */
  servantEnabled: boolean;
  /** L'Idiot du village déjà révélé meurt s'il est de nouveau désigné. */
  idiotDiesSecondTime: boolean;
  /** Points de voix supplémentaires infligés par le Corbeau. */
  ravenBonus: number;
  /** Ce qui prive le Grand Méchant Loup de sa seconde victime. */
  bigBadWolfRule: BigBadWolfRule;
  /** Nuits où le Loup-Garou blanc se réveille seul (« une nuit sur deux »). */
  whiteWolfNights: NightParity;
  /** Deux Sœurs / Trois Frères : réveil facultatif une nuit sur deux (joueurs expérimentés). */
  siblingsWakeLater: boolean;
  /** Variante « pour les courageux » : un Idiot déjà révélé meurt avec l'Ancien tué par le village. */
  elderTakesIdiot: boolean;
  /** Variante « Nouvelle Lune » : cartes Événement tirées le matin (sauf le premier). */
  newMoonEvents: boolean;
  /** Tirage d'un événement un matin sur 1, 2 ou 3. */
  eventFrequency: 1 | 2 | 3;
}

/* ------------------------------------------------------------------ */
/* Configuration initiale d'une partie                                 */
/* ------------------------------------------------------------------ */

export interface SetupPlayer {
  id: PlayerId;
  name: string;
}

export interface GameSetup {
  /** Version du format des données de partie. */
  formatVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  /** Ordre = ordre des places autour de la table, dans le sens horaire. */
  players: SetupPlayer[];
  assignments: Record<PlayerId, RoleId>;
  /** Cartes hors jeu : 2 pour le Voleur, 3 pour le Comédien (Voleur d'abord). */
  extraCards: RoleId[];
  variants: Variants;
  customRoles: CustomRoleDef[];
  /** Groupes de l'Abominable sectaire. */
  sectGroups?: Record<PlayerId, 'A' | 'B'>;
  /** Rôles découverts par chaque joueur sur le téléphone (sans effet sur les règles). */
  dealMode?: 'cards' | 'phone';
}

/* ------------------------------------------------------------------ */
/* État calculé                                                         */
/* ------------------------------------------------------------------ */

export type DeathCause =
  | 'wolves'
  | 'big-bad-wolf'
  | 'white-wolf'
  | 'poison'
  | 'hunter'
  | 'heartbreak'
  | 'vote'
  | 'scapegoat'
  | 'rusty-sword'
  | 'custom-kill'
  | 'event'
  | 'mj';

export interface DeathInfo {
  cause: DeathCause;
  /** Libellé de phase : « Nuit 2 », « Jour 3 »… */
  phaseLabel: string;
  actionIndex: number;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  seat: number;
  /** Rôle actuellement détenu (peut changer : Voleur, Servante). */
  roleId: RoleId;
  originalRoleId: RoleId;
  team: Team;
  alive: boolean;
  death: DeathInfo | null;
  /** Utilisations restantes par pouvoir (heal, poison, shot, infect, judge, extraLife…). */
  uses: Record<string, number>;
  charmed: boolean;
  infected: boolean;
  idiotRevealed: boolean;
  /** Pouvoirs perdus (vengeance de l'Ancien, Renard sans flair…). */
  powersLost: boolean;
  /** Le Renard a perdu son flair. */
  foxPowerLost: boolean;
  /** Joueur transformé en loup (Enfant sauvage, Chien-loup). */
  transformed: boolean;
  /** Dernière personne protégée (Salvateur). */
  lastProtected: PlayerId | null;
  wildChildModel: PlayerId | null;
  /** Carte de Comédien jouée cette nuit (rôle effectif pour la nuit). */
  comedianRole: RoleId | null;
  /**
   * Nuit où le rôle est joué « comme une première nuit » : 1, ou la nuit qui
   * suit la reprise d'un rôle par la Servante dévouée (règle officielle).
   */
  firstNight: number;
  /** Joueurs (rôles personnalisés « marquer ») ayant marqué ce joueur. */
  markedBy: PlayerId[];
  /** Cartes Spiritisme déjà utilisées par la Gitane (1 à 5). */
  spiritCardsUsed: number[];
}

export type StepKind =
  | 'thief'
  | 'comedian'
  | 'wolfhound'
  | 'cupid'
  | 'lovers'
  | 'wild-child'
  | 'sisters'
  | 'brothers'
  | 'salvateur'
  | 'seer'
  | 'fox'
  | 'wolves'
  | 'infect'
  | 'white-wolf'
  | 'big-bad-wolf'
  | 'witch'
  | 'piper'
  | 'charmed'
  | 'raven'
  | 'judge'
  | 'bear-tamer'
  | 'gypsy'
  | 'custom'
  | 'bluff';

export interface StepPayload {
  target?: PlayerId | null;
  targets?: PlayerId[];
  /** Voleur : index de la carte prise (0 ou 1) ou null. Comédien : index de la carte. */
  cardIndex?: number | null;
  team?: 'village' | 'wolves';
  heal?: PlayerId | null;
  poison?: PlayerId | null;
  infect?: boolean;
  littleGirlCaught?: boolean;
  /** Gitane : numéro de la question (1 à 4) de la carte Spiritisme `cardIndex` (1 à 5). */
  question?: number;
}

export interface NightRecord {
  number: number;
  /** Joueurs au début de la nuit (base des choix « immédiats »). */
  startPlayers: PlayerState[];
  startLovers: [PlayerId, PlayerId] | null;
  choices: Record<string, StepPayload>;
  /** Cartes de comédien encore disponibles au début de la nuit. */
  startComedianCards: RoleId[];
}

export type BallotKind = 'mayor' | 'elimination';

export type BallotTarget = PlayerId | 'blank' | 'abstain';

export interface BallotOp {
  seq: number;
  type: 'add' | 'remove';
  target: BallotTarget;
  /** Votant identifié (mode nominatif, ou vote du maire en mode compteur). */
  voterId: PlayerId | null;
  weight: number;
  actionIndex: number;
}

export type BallotOutcome =
  | { kind: 'elected'; playerId: PlayerId }
  | { kind: 'eliminated'; playerId: PlayerId; viaScapegoat?: boolean; viaMayor?: boolean }
  | { kind: 'runoff'; candidates: PlayerId[] }
  | { kind: 'mayor-tiebreak'; candidates: PlayerId[] }
  | { kind: 'mj-tiebreak'; candidates: PlayerId[] }
  | { kind: 'none'; reason: 'no-votes' | 'tie' | 'no-mayor' };

export interface BallotResult {
  tallies: Record<PlayerId, number>;
  blank: number;
  abstentions: number;
  leaders: PlayerId[];
  topScore: number;
  outcome: BallotOutcome;
}

export interface Ballot {
  id: string;
  kind: BallotKind;
  day: number;
  round: number;
  parentId: string | null;
  mode: VoteMode;
  candidates: PlayerId[];
  voters: PlayerId[];
  ops: BallotOp[];
  status: 'open' | 'closed' | 'confirmed' | 'cancelled';
  result: BallotResult | null;
  ravenTarget: PlayerId | null;
  ravenBonus: number;
  /** Second vote décidé par le Juge bègue. */
  judgeSecondVote: boolean;
}

export type PendingDecision =
  | { id: string; kind: 'hunter-shot'; playerId: PlayerId }
  | { id: string; kind: 'mayor-succession'; fromPlayerId: PlayerId }
  | { id: string; kind: 'scapegoat-voters'; playerId: PlayerId }
  | { id: string; kind: 'mayor-tiebreak'; ballotId: string; candidates: PlayerId[] }
  | { id: string; kind: 'mj-tiebreak'; ballotId: string; candidates: PlayerId[] }
  | { id: string; kind: 'servant-offer'; victimId: PlayerId; servantId: PlayerId; ballotId: string }
  | { id: string; kind: 'custom-shot'; playerId: PlayerId };

export interface DecisionPayload {
  target?: PlayerId | null;
  targets?: PlayerId[];
  accept?: boolean;
}

export type Phase =
  | { kind: 'night'; number: number }
  | { kind: 'dawn'; number: number }
  | { kind: 'day'; number: number }
  | { kind: 'ended' };

export type Winner =
  | 'village'
  | 'wolves'
  | 'lovers'
  | 'piper'
  | 'white-wolf'
  | 'angel'
  | 'sectarian'
  | 'custom'
  | 'none'
  | 'abandoned';

export interface Victory {
  winner: Winner;
  /** Rôle personnalisé vainqueur (winner = 'custom'). */
  customRoleId?: RoleId;
  winners: PlayerId[];
  reason: string;
}

export type GameEvent =
  | { type: 'game-started' }
  | { type: 'phase'; phase: Phase }
  | { type: 'step-done'; stepKey: string; kind: StepKind; actorIds: PlayerId[]; payload: StepPayload }
  | { type: 'thief-swap'; playerId: PlayerId; from: RoleId; to: RoleId }
  | { type: 'lovers'; lovers: [PlayerId, PlayerId] }
  | { type: 'wolfhound'; playerId: PlayerId; team: 'village' | 'wolves' }
  | { type: 'wild-model'; playerId: PlayerId; modelId: PlayerId }
  | { type: 'comedian-card'; playerId: PlayerId; roleId: RoleId }
  | { type: 'protected'; targetId: PlayerId; byId: PlayerId }
  | { type: 'attack-blocked'; targetId: PlayerId; source: DeathCause; by: 'protection' | 'heal' | 'elder' }
  | { type: 'seer'; byId: PlayerId; targetId: PlayerId; roleId: RoleId }
  | { type: 'fox'; byId: PlayerId; targetIds: PlayerId[]; foundWolf: boolean }
  | { type: 'infected'; targetId: PlayerId }
  | { type: 'potion'; kind: 'heal' | 'poison'; targetId: PlayerId; byId: PlayerId }
  | { type: 'charmed'; targetIds: PlayerId[] }
  | { type: 'raven'; targetId: PlayerId }
  | { type: 'custom-action'; byId: PlayerId; targetId: PlayerId; action: CustomNightAction }
  | { type: 'death'; playerId: PlayerId; cause: DeathCause; roleId: RoleId }
  | { type: 'elder-life-lost'; playerId: PlayerId }
  | { type: 'elder-vengeance'; playerId: PlayerId }
  | { type: 'transformed'; playerId: PlayerId; reason: 'wild-child' | 'infect' }
  | { type: 'rusty-curse'; wolfId: PlayerId }
  | { type: 'bear'; growled: boolean; tamerId: PlayerId }
  | { type: 'idiot-revealed'; playerId: PlayerId }
  | { type: 'mayor'; playerId: PlayerId | null; how: 'elected' | 'designated' | 'removed' }
  | { type: 'ballot-opened'; ballotId: string; kind: BallotKind; round: number }
  | { type: 'ballot-closed'; ballotId: string; outcome: BallotOutcome }
  | { type: 'ballot-cancelled'; ballotId: string }
  | { type: 'vote'; ballotId: string; op: BallotOp }
  | { type: 'servant'; servantId: PlayerId; victimId: PlayerId; roleId: RoleId }
  | { type: 'scapegoat-voters'; voters: PlayerId[]; day: number }
  | { type: 'angel-now-villager'; playerId: PlayerId }
  | { type: 'decision'; decisionKind: PendingDecision['kind']; payload: DecisionPayload }
  | { type: 'victory'; victory: Victory }
  | { type: 'revived'; playerId: PlayerId; roleId: RoleId }
  | { type: 'team-changed'; playerId: PlayerId; team: Team }
  | { type: 'use-granted'; playerId: PlayerId; key: GrantableUse }
  | { type: 'extra-vote' }
  | { type: 'mayor-abolished'; playerId: PlayerId }
  | { type: 'event-drawn'; cardId: string; day: number; readerId: PlayerId | null }
  | { type: 'spiritualism'; source: 'gypsy' | 'event'; askerId: PlayerId | null; answererId: PlayerId | null; card: number | null; question: number | null }
  | { type: 'marked'; byId: PlayerId; targetId: PlayerId }
  | { type: 'note'; text: string };

/** Utilisations qu'un événement peut rendre (ex. « Cueillette » : potion de la Sorcière). */
export type GrantableUse = 'heal' | 'poison' | 'shot';

/** Carte Événement tirée (variante Nouvelle Lune). */
export interface DrawnEvent {
  cardId: string;
  day: number;
  /** Nombre de nuits déjà commencées au moment du tirage. */
  nightsBefore: number;
  actionIndex: number;
}

export interface LogEntry {
  seq: number;
  actionIndex: number;
  phaseLabel: string;
  event: GameEvent;
  /** Contient une information secrète (rôle, cible nocturne…). */
  secret: boolean;
}

export interface GameState {
  setup: GameSetup;
  phase: Phase;
  nightNumber: number;
  dayNumber: number;
  players: PlayerState[];
  lovers: [PlayerId, PlayerId] | null;
  mayorId: PlayerId | null;
  /** Le maire a déjà été élu au moins une fois. */
  mayorEverElected: boolean;
  /** Le poste de maire est perdu définitivement (Idiot révélé qui était maire). */
  mayorAbolished: boolean;
  /** Cartes Événement tirées (variante Nouvelle Lune). */
  events: DrawnEvent[];
  /** Scrutins d'élimination supplémentaires accordés aujourd'hui (événements). */
  extraVotesToday: number;
  /** Question Spiritisme de la Gitane à poser au matin. */
  spiritQuestion: { askerId: PlayerId; card: number; question: number; night: number } | null;
  night: NightRecord | null;
  /** Rapport de l'aube courante (événements calculés à la résolution). */
  dawnReport: LogEntry[];
  ballots: Ballot[];
  activeBallotId: string | null;
  pending: PendingDecision[];
  /** Cible du Corbeau pour un jour donné. */
  ravenMark: { targetId: PlayerId; day: number } | null;
  /** Restriction de votants décidée par le Bouc émissaire. */
  restrictedVoters: { day: number; voters: PlayerId[] } | null;
  /** Mort différée du Chevalier à l'épée rouillée. */
  rustyCurse: { wolfId: PlayerId; night: number } | null;
  /** Cartes de Comédien restantes. */
  comedianCards: RoleId[];
  villagePowersLost: boolean;
  angelVictory: PlayerId | null;
  /** L'élimination du jour a été confirmée (une par jour, sauf Juge bègue). */
  eliminationsToday: number;
  judgeSecondVoteAvailable: boolean;
  victory: Victory | null;
  log: LogEntry[];
  actionCount: number;
  idCounter: number;
}

/* ------------------------------------------------------------------ */
/* Actions déclarées par le MJ                                          */
/* ------------------------------------------------------------------ */

export type GameAction =
  | { type: 'night/submit'; stepKey: string; payload: StepPayload }
  | { type: 'night/resolve' }
  | { type: 'dawn/confirm' }
  | { type: 'day/end' }
  | { type: 'ballot/open'; kind: BallotKind; mode?: VoteMode; candidates?: PlayerId[] }
  | { type: 'ballot/candidate'; playerId: PlayerId; add: boolean }
  | { type: 'ballot/vote'; target: BallotTarget; voterId?: PlayerId | null }
  | { type: 'ballot/unvote'; target: BallotTarget; voterId?: PlayerId | null }
  | { type: 'ballot/close' }
  | { type: 'ballot/reopen' }
  | { type: 'ballot/confirm'; spared?: boolean }
  | { type: 'ballot/cancel' }
  | { type: 'judge/second-vote' }
  | { type: 'decision/resolve'; decisionId: string; payload: DecisionPayload }
  | { type: 'mj/eliminate'; playerId: PlayerId }
  | { type: 'mj/note'; text: string }
  | { type: 'mj/revive'; playerId: PlayerId; asVillager: boolean }
  | { type: 'mj/set-team'; playerId: PlayerId; team: 'village' | 'wolves' }
  | { type: 'mj/grant-use'; playerId: PlayerId; key: GrantableUse }
  | { type: 'mj/extra-vote' }
  | { type: 'mj/remove-mayor' }
  | { type: 'event/draw'; cardId: string }
  | { type: 'ballot/set-count'; target: BallotTarget; count: number }
  | { type: 'game/finish' }
  | { type: 'game/abandon' };

export interface TimedAction {
  action: GameAction;
  at: string;
}

export interface GameRecord {
  setup: GameSetup;
  actions: TimedAction[];
}

export class RuleError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'RuleError';
  }
}
