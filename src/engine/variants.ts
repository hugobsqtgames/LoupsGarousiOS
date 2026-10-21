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
  { key: 'scapegoatOnTie', label: 'Bouc émissaire prioritaire', help: 'En cas d’égalité, le Bouc émissaire vivant est éliminé avant tout départage.', official: false },
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
  { key: 'salvateurSelf', label: 'Le Salvateur peut se protéger', help: 'Interprétation la plus répandue.', official: false },
  { key: 'salvateurNoRepeat', label: 'Salvateur : pas deux fois la même cible', help: 'Interdit de protéger la même personne deux nuits de suite.', official: false },
  { key: 'witchSelfHeal', label: 'La Sorcière peut se sauver', help: 'Autorise la potion de vie sur elle-même.', official: false },
  {
    key: 'elderVengeance',
    label: 'Vengeance de l’Ancien',
    help: 'Qui déclenche la perte des pouvoirs du village quand l’Ancien meurt ?',
    official: false,
    choices: [
      { value: 'village', label: 'Vote, Chasseur ou Sorcière' },
      { value: 'vote_only', label: 'Vote uniquement' },
    ],
  },
  {
    key: 'angelWindow',
    label: 'Fenêtre de victoire de l’Ange',
    help: 'Période pendant laquelle la mort de l’Ange le fait gagner.',
    official: false,
    choices: [
      { value: 'first_round', label: 'Premier vote ou première nuit' },
      { value: 'first_vote', label: 'Premier vote uniquement' },
    ],
  },
  { key: 'angelStartsWithDay', label: 'Avec l’Ange, commencer par le jour', help: 'La partie débute par un débat et un vote.', official: false },
  {
    key: 'wildChildTrigger',
    label: 'Transformation de l’Enfant sauvage',
    help: 'Quand la mort du modèle transforme-t-elle l’Enfant ?',
    official: false,
    choices: [
      { value: 'any_death', label: 'Toute mort du modèle' },
      { value: 'wolves_only', label: 'Mort par les loups uniquement' },
    ],
  },
  { key: 'cupidWinsWithMixedLovers', label: 'Cupidon gagne avec un couple mixte', help: 'Variante : Cupidon partage la victoire des Amoureux.', official: false },
  { key: 'servantEnabled', label: 'Proposer la Servante dévouée', help: 'Après chaque élimination par vote, proposer l’intervention de la Servante.', official: false },
  { key: 'idiotDiesSecondTime', label: 'Idiot révélé : mort au second vote', help: 'Un Idiot déjà révélé et de nouveau désigné est éliminé.', official: false },
  {
    key: 'ravenBonus',
    label: 'Voix ajoutées par le Corbeau',
    help: 'Nombre de voix ajoutées contre la cible du Corbeau.',
    official: false,
    choices: [
      { value: 1, label: '1 voix' },
      { value: 2, label: '2 voix' },
      { value: 3, label: '3 voix' },
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
