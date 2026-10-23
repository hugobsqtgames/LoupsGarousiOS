import type { Variants } from './types';

/** Valeurs par défaut : règle de base + interprétations documentées. */
export const DEFAULT_VARIANTS: Variants = {
  mayorEnabled: true,
  mayorVoteWeight: 2,
  mayorTie: 'runoff_then_mj',
  mayorSuccession: 'designate',
  eliminationTie: 'mayor_then_runoff',
  scapegoatOnTie: true,
  voteMode: 'tally',
  allowBlankVotes: true,
  strictVoterCount: true,
  callInactiveRoles: true,
  salvateurSelf: true,
  salvateurNoRepeat: true,
  witchSelfHeal: true,
  elderVengeance: 'village',
  angelWindow: 'first_round',
  angelStartsWithDay: true,
  wildChildTrigger: 'any_death',
  cupidWinsWithMixedLovers: false,
  servantEnabled: true,
  idiotDiesSecondTime: true,
  ravenBonus: 2,
  bigBadWolfRule: 'wolf_died',
  whiteWolfNights: 'even',
  siblingsWakeLater: false,
  elderTakesIdiot: false,
  newMoonEvents: false,
  eventFrequency: 1,
};

export interface VariantOption<K extends keyof Variants> {
  key: K;
  label: string;
  help: string;
  official: boolean;
  choices?: { value: Variants[K]; label: string }[];
}

type AnyVariantOption = { [K in keyof Variants]: VariantOption<K> }[keyof Variants];

/** Description des variantes pour l'écran de configuration. */
export const VARIANT_OPTIONS: AnyVariantOption[] = [
  { key: 'mayorEnabled', label: 'Élection du maire', help: 'Le premier jour, le village élit un maire (Capitaine).', official: true },
  {
    key: 'mayorVoteWeight',
    label: 'Poids du vote du maire',
    help: 'Règle de base : la voix du maire compte double.',
    official: true,
    choices: [
      { value: 2, label: 'Double (officiel)' },
      { value: 1, label: 'Simple' },
    ],
  },
  {
    key: 'mayorTie',
    label: 'Égalité à l’élection du maire',
    help: 'Non précisé par la règle de base.',
    official: false,
    choices: [
      { value: 'runoff_then_mj', label: 'Second tour, puis décision du MJ' },
      { value: 'mj_decides', label: 'Décision du MJ' },
      { value: 'no_mayor', label: 'Pas de maire' },
    ],
  },
  {
    key: 'mayorSuccession',
    label: 'Succession du maire',
    help: 'Règle de base : le maire mourant désigne son successeur.',
    official: true,
    choices: [
      { value: 'designate', label: 'Le maire désigne (officiel)' },
      { value: 'election', label: 'Nouvelle élection' },
    ],
  },
  {
    key: 'eliminationTie',
    label: 'Égalité au vote d’élimination',
    help: 'Règle de base : le maire tranche ; sans maire, second vote ; si l’égalité persiste, personne n’est éliminé.',
    official: true,
    choices: [
      { value: 'mayor_then_runoff', label: 'Maire, sinon second vote (officiel)' },
      { value: 'runoff', label: 'Toujours un second vote' },
      { value: 'none', label: 'Personne n’est éliminé' },
    ],
  },
  { key: 'scapegoatOnTie', label: 'Bouc émissaire prioritaire', help: 'Règle officielle : en cas d’égalité, le Bouc émissaire est éliminé à la place des ex æquo. Sa priorité sur le maire n’est pas précisée.', official: true },
  {
    key: 'voteMode',
    label: 'Saisie des votes par défaut',
    help: 'Compteur : + / − par joueur. Nominatif : qui vote pour qui.',
    official: false,
    choices: [
      { value: 'tally', label: 'Compteur de voix' },
      { value: 'nominal', label: 'Vote nominatif' },
    ],
  },
  { key: 'allowBlankVotes', label: 'Votes blancs', help: 'Autorise l’enregistrement de votes blancs.', official: false },
  { key: 'strictVoterCount', label: 'Limiter au nombre de votants', help: 'Empêche d’enregistrer plus de voix que de votants.', official: false },
  { key: 'callInactiveRoles', label: 'Appeler les rôles absents', help: 'Le MJ appelle aussi les rôles morts ou hors jeu pour ne rien révéler.', official: false },
  { key: 'salvateurSelf', label: 'Le Salvateur peut se protéger', help: 'Règle officielle (livret Nouvelle Lune).', official: true },
  { key: 'salvateurNoRepeat', label: 'Salvateur : pas deux fois la même cible', help: 'Règle officielle : jamais la même personne deux nuits de suite.', official: true },
  { key: 'witchSelfHeal', label: 'La Sorcière peut se sauver', help: 'Règle officielle : elle peut se guérir si elle vient d’être attaquée.', official: true },
  {
    key: 'elderVengeance',
    label: 'Vengeance de l’Ancien',
    help: 'Règle officielle : le vote, la potion de mort ou le tir du Chasseur privent les villageois de leurs pouvoirs.',
    official: true,
    choices: [
      { value: 'village', label: 'Vote, Chasseur ou Sorcière (officiel)' },
      { value: 'vote_only', label: 'Vote uniquement' },
    ],
  },
  {
    key: 'angelWindow',
    label: 'Fenêtre de victoire de l’Ange',
    help: 'Règle officielle : éliminé au premier tour (vote du premier jour, loups ou potion de la première nuit).',
    official: true,
    choices: [
      { value: 'first_round', label: 'Premier vote ou première nuit (officiel)' },
      { value: 'first_vote', label: 'Premier vote uniquement' },
    ],
  },
  { key: 'angelStartsWithDay', label: 'Avec l’Ange, commencer par le jour', help: 'Règle officielle : la partie débute par un débat et un vote.', official: true },
  {
    key: 'wildChildTrigger',
    label: 'Transformation de l’Enfant sauvage',
    help: 'Règle officielle : toute élimination du modèle le transforme.',
    official: true,
    choices: [
      { value: 'any_death', label: 'Toute mort du modèle (officiel)' },
      { value: 'wolves_only', label: 'Mort par les loups uniquement' },
    ],
  },
  { key: 'cupidWinsWithMixedLovers', label: 'Cupidon gagne avec un couple mixte', help: 'Variante : Cupidon partage la victoire des Amoureux.', official: false },
  { key: 'servantEnabled', label: 'Proposer la Servante dévouée', help: 'Après chaque élimination par vote, proposer l’intervention de la Servante (règle officielle).', official: true },
  { key: 'idiotDiesSecondTime', label: 'Idiot révélé : mort au second vote', help: 'Un Idiot déjà révélé et de nouveau désigné est éliminé.', official: false },
  {
    key: 'ravenBonus',
    label: 'Voix ajoutées par le Corbeau',
    help: 'Règle officielle (Le Village) : 2 voix.',
    official: true,
    choices: [
      { value: 1, label: '1 voix' },
      { value: 2, label: '2 voix (officiel)' },
      { value: 3, label: '3 voix' },
    ],
  },
  {
    key: 'bigBadWolfRule',
    label: 'Grand Méchant Loup : fin de la seconde victime',
    help: 'Les livrets divergent : « Best Of » (aucun autre loup éliminé) ou « Personnages » (aucun loup, Enfant sauvage ni Chien-loup éliminé).',
    official: true,
    choices: [
      { value: 'wolf_died', label: 'Un loup éliminé (Best Of)' },
      { value: 'wolf_or_ambiguous_died', label: 'Loup, Enfant sauvage ou Chien-loup éliminé (Personnages)' },
    ],
  },
  {
    key: 'whiteWolfNights',
    label: 'Nuits du Loup-Garou blanc',
    help: 'Le livret dit « une nuit sur deux » sans préciser lesquelles.',
    official: false,
    choices: [
      { value: 'even', label: 'Nuits paires (2, 4, 6…)' },
      { value: 'odd', label: 'Nuits impaires (1, 3, 5…)' },
    ],
  },
  { key: 'siblingsWakeLater', label: 'Sœurs et Frères : réveils suivants', help: 'Pour joueurs expérimentés : ils se réveillent aussi une nuit sur deux pour se concerter (règle officielle facultative).', official: true },
  { key: 'elderTakesIdiot', label: 'Ancien : variante pour les courageux', help: 'Si l’Ancien est tué par le village, un Idiot déjà révélé est éliminé avec lui (variante du livret Nouvelle Lune).', official: true },
  { key: 'newMoonEvents', label: 'Cartes Événement (Nouvelle Lune)', help: 'Chaque matin sauf le premier, un événement est tiré (cartes de l’extension Nouvelle Lune).', official: true },
  {
    key: 'eventFrequency',
    label: 'Fréquence des événements',
    help: 'Le livret conseille un tirage un matin sur deux ou trois pour les premières parties.',
    official: true,
    choices: [
      { value: 1, label: 'Chaque matin' },
      { value: 2, label: 'Un matin sur deux' },
      { value: 3, label: 'Un matin sur trois' },
    ],
  },
];

export interface VariantIssue {
  level: 'error' | 'warning';
  message: string;
}

/** Détecte les combinaisons incohérentes ou sans effet. */
export function checkVariants(v: Variants): VariantIssue[] {
  const issues: VariantIssue[] = [];
  if (!v.mayorEnabled && v.eliminationTie === 'mayor_then_runoff') {
    issues.push({ level: 'warning', message: 'Sans maire, les égalités au vote seront départagées par un second vote.' });
  }
  if (!v.mayorEnabled && v.mayorVoteWeight === 2) {
    issues.push({ level: 'warning', message: 'Le poids du vote du maire est sans effet sans élection du maire.' });
  }
  if (!v.newMoonEvents && v.eventFrequency !== 1) {
    issues.push({ level: 'warning', message: 'La fréquence des événements est sans effet sans la variante Nouvelle Lune.' });
  }
  if (!Number.isInteger(v.ravenBonus) || v.ravenBonus < 0 || v.ravenBonus > 5) {
    issues.push({ level: 'error', message: 'Le bonus du Corbeau doit être un entier entre 0 et 5.' });
  }
  return issues;
}

/** Fusionne des variantes partielles (ex. import, ancien format) avec les valeurs par défaut. */
export function normalizeVariants(input: unknown): Variants {
  const out: Variants = { ...DEFAULT_VARIANTS };
  if (typeof input !== 'object' || input === null) return out;
  const src = input as Record<string, unknown>;
  for (const opt of VARIANT_OPTIONS) {
    const val = src[opt.key];
    if (val === undefined) continue;
    const def = DEFAULT_VARIANTS[opt.key];
    if (typeof val !== typeof def) continue;
    if (opt.choices && !opt.choices.some((c) => c.value === val)) continue;
    (out as unknown as Record<string, unknown>)[opt.key] = val;
  }
  return out;
}
