import { aliveNeighbors, findPlayer } from './selectors';
import type { GameState, PlayerId } from './types';

/**
 * Cartes Événement de la variante « Nouvelle Lune » (36 cartes).
 *
 * Source de la liste et des effets : livret de l'extension Nouvelle Lune
 * (règle de la variante n° 9 et de la carte Spiritisme, consultés) et
 * transcription anglaise des 36 cartes (graysbluemoon.blogspot.com, 2010).
 * Les textes ci-dessous sont des **résumés rédigés pour l'application**, pas
 * le texte imprimé : le MJ lit la carte physique.
 *
 * - `nameStatus` : « attesté » = nom français relevé dans une source
 *   francophone ; « traduit » = traduction de l'application.
 * - `moon` : catégorie d'effet (immédiat / différé / permanent). La carte porte
 *   un symbole de lune que nous n'avons pas pu vérifier : la catégorie est
 *   déduite du texte de l'effet.
 * - `automation` : ce que l'application applique elle-même. Les autres effets
 *   sont guidés (rappels + outils du MJ : élimination, retour en jeu, changement
 *   de camp, vote supplémentaire, etc.).
 */

export type EventMoon = 'immediate' | 'delayed' | 'permanent';

/** Durée pendant laquelle l'événement est rappelé au MJ. */
export type EventScope = 'day' | 'day-and-night' | 'next-night' | 'next-vote' | 'permanent';

/** Outils proposés au MJ quand la carte est active. */
export type EventTool = 'extra-vote' | 'revive' | 'set-team' | 'grant-use' | 'remove-mayor' | 'coin' | 'spare' | 'eliminate';

export type EventAutomation = 'backfire' | 'hide-vote-roles' | 'hide-wolf-victim-roles' | 'spiritualism' | 'spare';

export interface EventCard {
  id: string;
  /** Numéro dans la transcription consultée (1 à 36). */
  number: number;
  name: string;
  nameStatus: 'attesté' | 'traduit';
  moon: EventMoon;
  scope: EventScope;
  summary: string;
  /** Conseil de mise en œuvre pour le MJ. */
  howTo: string;
  tools: EventTool[];
  automation: EventAutomation[];
  /** Étapes de nuit concernées par un rappel. */
  nightReminders?: string[];
  /** Interprétation de l'application lorsque la carte est ambiguë. */
  uncertainty?: string;
}

const card = (c: EventCard) => c;

export const EVENT_CARDS: readonly EventCard[] = [
  card({
    id: 'somnambulisme', number: 1, name: 'Somnambulisme', nameStatus: 'traduit', moon: 'permanent', scope: 'permanent',
    summary: 'La Voyante est somnambule : jusqu’à la fin de la partie, le MJ annonce à voix haute le rôle qu’elle découvre, sans dire de quel joueur il s’agit.',
    howTo: 'À chaque étape de la Voyante, annoncez le rôle vu au village.', tools: [], automation: [], nightReminders: ['seer'],
  }),
  card({
    id: 'contact-mortel', number: 2, name: 'Contact mortel', nameStatus: 'traduit', moon: 'permanent', scope: 'permanent',
    summary: 'Pour être dévorée, la victime des loups doit désormais être touchée par l’un d’eux ; sinon il n’y a pas de victime.',
    howTo: 'À l’étape des loups, si personne n’a touché la victime, enregistrez « aucune victime ».', tools: [], automation: [], nightReminders: ['wolves'],
  }),
  card({
    id: 'bourreau', number: 3, name: 'Le Bourreau', nameStatus: 'traduit', moon: 'permanent', scope: 'permanent',
    summary: 'Le village élit un Bourreau : jusqu’à la fin de la partie, seul lui connaît le rôle des joueurs éliminés par le vote, et les cartes ne sont plus montrées.',
    howTo: 'Faites désigner le Bourreau. L’application masque désormais le rôle des éliminés du vote dans les annonces publiques.',
    tools: [], automation: ['hide-vote-roles'],
  }),
  card({
    id: 'ensevelissement', number: 4, name: 'Ensevelissement', nameStatus: 'attesté', moon: 'permanent', scope: 'permanent',
    summary: 'Les loups enterrent leurs victimes : jusqu’à la fin de la partie, le rôle des victimes des loups n’est plus révélé.',
    howTo: 'L’application masque désormais le rôle des victimes des loups dans les annonces publiques.', tools: [], automation: ['hide-wolf-victim-roles'],
  }),
  card({
    id: 'agent-double', number: 5, name: 'Agent double', nameStatus: 'traduit', moon: 'immediate', scope: 'day-and-night',
    summary: 'Pendant que le village dort, le premier éliminé désigne un joueur qui n’est pas loup ; le MJ lui montre les loups et il devient leur allié secret.',
    howTo: 'Utilisez « Changer de camp » pour passer l’agent double dans le camp des loups.', tools: ['set-team'], automation: [],
    uncertainty: 'Moment exact (nuit suivante) et victoire de l’agent avec les loups : interprétation de l’application.',
  }),
  card({
    id: 'petiot', number: 6, name: 'Le Petiot', nameStatus: 'attesté', moon: 'delayed', scope: 'day-and-night',
    summary: 'Le plus jeune joueur part chercher de l’aide au village voisin : absent pour la journée et la nuit, il revient le lendemain matin et sa voix compte triple au vote suivant.',
    howTo: 'Le jour de son retour, ajoutez 3 voix pour sa cible (désactivez au besoin la limite du nombre de votants).', tools: [], automation: [],
  }),
  card({
    id: 'retour-de-flamme', number: 7, name: 'Retour de flamme', nameStatus: 'traduit', moon: 'delayed', scope: 'next-night',
    summary: 'La nuit suivante, si les loups désignent un Simple Villageois, il n’est pas éliminé mais devient loup ; sinon la victime survit et le premier loup à sa gauche est foudroyé.',
    howTo: 'Appliqué automatiquement à la résolution de la nuit suivante (victime de la meute non protégée).', tools: [], automation: ['backfire'],
    uncertainty: 'Interaction avec le Salvateur et la potion de vie : l’effet ne s’applique que si l’attaque de la meute aurait réussi.',
  }),
  card({
    id: 'mecontentement', number: 8, name: 'Mécontentement', nameStatus: 'attesté', moon: 'delayed', scope: 'next-vote',
    summary: 'Si le prochain éliminé par le village n’est pas un loup, le village vote une seconde fois, aussitôt et sans débat.',
    howTo: 'Après le vote, si l’éliminé n’était pas un loup, utilisez « Vote supplémentaire ».', tools: ['extra-vote'], automation: [],
  }),
  card({
    id: 'influences', number: 9, name: 'Influences', nameStatus: 'traduit', moon: 'delayed', scope: 'next-vote',
    summary: 'Le prochain vote se fait à tour de rôle : chacun désigne un joueur et garde le bras tendu, puis son voisin de gauche vote, et ainsi de suite.',
    howTo: 'Utilisez le vote nominatif pour suivre l’ordre des votes.', tools: [], automation: [],
  }),
  card({
    id: 'pleine-lune', number: 10, name: 'Lever de pleine lune', nameStatus: 'traduit', moon: 'delayed', scope: 'next-night',
    summary: 'La nuit suivante, les loups deviennent voyants (chacun sonde un joueur) ; le Chasseur, la Sorcière et la Voyante deviennent loups et éliminent ensemble un joueur.',
    howTo: 'Nuit guidée : enregistrez « aucune victime » à l’étape des loups, puis éliminez à l’aube la victime choisie par les nouveaux loups (« Élimination manuelle »).',
    tools: ['eliminate'], automation: [], nightReminders: ['wolves', 'seer', 'witch'],
    uncertainty: 'Effet limité à une nuit (interprétation) ; les pouvoirs habituels ne sont pas appliqués par l’application cette nuit-là.',
  }),
  card({
    id: 'enthousiasme', number: 11, name: 'Enthousiasme', nameStatus: 'attesté', moon: 'delayed', scope: 'next-vote',
    summary: 'Si le prochain éliminé par le village est un loup, le village, ravi, vote une seconde fois, aussitôt et sans débat.',
    howTo: 'Après le vote, si l’éliminé était un loup, utilisez « Vote supplémentaire ».', tools: ['extra-vote'], automation: [],
  }),
  card({
    id: 'spectre', number: 12, name: 'Le Spectre', nameStatus: 'traduit', moon: 'delayed', scope: 'next-night',
    summary: 'La prochaine victime des loups ouvre les yeux, devient loup et désigne l’un des anciens loups, qui est aussitôt éliminé.',
    howTo: 'À l’aube : « Ramener en jeu » la victime, « Changer de camp » vers les loups, puis « Élimination manuelle » du loup désigné.',
    tools: ['revive', 'set-team', 'eliminate'], automation: [],
  }),
  card({
    id: 'miracle', number: 13, name: 'Miracle', nameStatus: 'traduit', moon: 'immediate', scope: 'day',
    summary: 'La dernière victime des loups n’était qu’évanouie : elle revient aussitôt en jeu, mais comme Simple Villageois.',
    howTo: 'Utilisez « Ramener en jeu » (en Simple Villageois) sur la dernière victime des loups.', tools: ['revive'], automation: [],
    uncertainty: 'Si son Amoureux est mort de chagrin, il reste mort (interprétation).',
  }),
  card({
    id: 'bonnes-manieres', number: 14, name: 'Bonnes manières', nameStatus: 'attesté', moon: 'immediate', scope: 'day',
    summary: 'Interdit de couper la parole : chacun parle à son tour. Celui qui enfreint la règle perd son droit de vote pour ce tour.',
    howTo: 'Retirez les voix des contrevenants au moment du vote.', tools: [], automation: [],
  }),
  card({
    id: 'saint-philippe', number: 15, name: 'Saint Philippe', nameStatus: 'traduit', moon: 'immediate', scope: 'day',
    summary: 'Le village élit un nouveau chef charismatique : un maire en place est destitué et un nouveau maire est élu.',
    howTo: 'Utilisez « Destituer le maire », puis ouvrez l’élection du maire.', tools: ['remove-mayor'], automation: [],
  }),
  card({
    id: 'pile-ou-face', number: 16, name: 'Pile ou face', nameStatus: 'attesté', moon: 'immediate', scope: 'day',
    summary: 'Juste après le verdict du vote, une pièce décide du sort du condamné : gracié d’un côté, éliminé de l’autre.',
    howTo: 'Clôturez le vote, lancez la pièce, puis validez en choisissant « Gracier » ou « Éliminer ».', tools: ['coin', 'spare'], automation: ['spare'],
  }),
  card({
    id: 'cueillette', number: 17, name: 'La cueillette', nameStatus: 'traduit', moon: 'immediate', scope: 'day',
    summary: 'Les joueuses partent cueillir des plantes en forêt jusqu’au soir : elles ne débattent ni ne votent, et on ne peut pas voter contre elles. La Sorcière récupère une potion avant la nuit.',
    howTo: 'Utilisez « Rendre une potion » pour la Sorcière ; n’enregistrez pas de voix contre les absentes.', tools: ['grant-use'], automation: [],
    uncertainty: 'La carte ne précise pas quelle potion : le MJ choisit.',
  }),
  card({
    id: 'dimanche-radieux', number: 18, name: 'Dimanche radieux', nameStatus: 'traduit', moon: 'immediate', scope: 'day',
    summary: 'Journée sans incident, sauf si le MJ décide d’appliquer la variante « Fascination lycanthropique ».',
    howTo: 'Tour normal.', tools: [], automation: [],
  }),
  card({
    id: 'bal-samedi', number: 19, name: 'Bal du samedi soir', nameStatus: 'attesté', moon: 'immediate', scope: 'day-and-night',
    summary: 'La moitié la plus jeune du village part danser jusqu’à l’aube : ni débat ni vote pour eux, on ne peut pas voter contre eux ; la nuit, ils ne peuvent ni dévorer ni être dévorés.',
    howTo: 'N’enregistrez pas de voix contre les danseurs ; refusez une victime parmi eux à l’étape des loups.', tools: [], automation: [], nightReminders: ['wolves'],
  }),
  card({
    id: 'eclipse', number: 20, name: 'Éclipse', nameStatus: 'traduit', moon: 'immediate', scope: 'day',
    summary: 'Les joueurs débattent dos au cercle, sans se regarder ; celui qui se retourne perd son vote. Tout le monde se retourne au moment du vote.',
    howTo: 'Retirez les voix des contrevenants au moment du vote.', tools: [], automation: [],
  }),
  card({
    id: 'pacte-diable', number: 21, name: 'Pacte avec le diable', nameStatus: 'traduit', moon: 'immediate', scope: 'day',
    summary: 'Juste après le verdict, le condamné peut pactiser avec le diable : il n’est pas éliminé. Mais si son camp gagne, il sera exclu de la partie suivante.',
    howTo: 'Validez le vote avec « Gracier » si le condamné accepte le pacte ; notez-le pour la partie suivante.', tools: ['spare'], automation: ['spare'],
  }),
  card({
    id: 'deluge', number: 22, name: 'Déluge', nameStatus: 'attesté', moon: 'immediate', scope: 'day-and-night',
    summary: 'Une inondation sépare le village en deux refuges : pas de vote aujourd’hui ; la nuit suivante, les loups mangent dans chaque refuge où ils se trouvent (jusqu’à deux victimes). Ne s’applique que s’il reste au moins 6 joueurs.',
    howTo: 'Ne votez pas ce jour-là ; à l’aube, ajoutez la seconde victime avec « Élimination manuelle ».', tools: ['eliminate'], automation: [],
    uncertainty: 'Répartition des refuges selon le genre des joueurs (texte de la carte) : à adapter librement par le MJ.',
  }),
  card({
    id: 'poisson-avril', number: 23, name: 'Poisson d’avril', nameStatus: 'traduit', moon: 'immediate', scope: 'day-and-night',
    summary: 'Pour un tour, certains personnages échangent leurs pouvoirs (Sorcière/Voyante, Chasseur/Petite Fille, Salvateur/Ancien) et les Amoureux se détestent : la mort de l’un n’entraîne pas celle de l’autre.',
    howTo: 'Tour guidé : l’application n’échange pas les pouvoirs. Utilisez les outils manuels pour corriger les effets.', tools: ['revive', 'eliminate'], automation: [],
    uncertainty: 'Effet non automatisé (trop d’interactions) : le MJ arbitre.',
  }),
  card({
    id: 'fin-moissons', number: 24, name: 'Fin des moissons', nameStatus: 'traduit', moon: 'immediate', scope: 'day',
    summary: 'Tout le monde est fatigué, rien de spécial, sauf si le MJ décide d’appliquer la variante « Fête de la moisson ».',
    howTo: 'Tour normal.', tools: [], automation: [],
  }),
  card({
    id: 'grande-mefiance', number: 25, name: 'Grande méfiance', nameStatus: 'attesté', moon: 'immediate', scope: 'day',
    summary: 'Chacun désigne des deux mains ses deux meilleurs amis ; tout joueur qui n’est désigné par personne est éliminé (il peut y en avoir plusieurs, ou aucun).',
    howTo: 'Ne lancez pas de vote classique ; éliminez les joueurs sans voix avec « Élimination manuelle ».', tools: ['eliminate'], automation: [],
  }),
  card({
    id: 'repas-anciens', number: 26, name: 'Repas des anciens', nameStatus: 'attesté', moon: 'immediate', scope: 'day',
    summary: 'La moitié la plus âgée du village passe la journée au banquet voisin : ni débat ni vote pour eux, et on ne peut pas voter contre eux.',
    howTo: 'N’enregistrez ni voix des absents, ni voix contre eux.', tools: [], automation: [],
  }),
  card({
    id: 'chatiment', number: 27, name: 'Châtiment', nameStatus: 'traduit', moon: 'immediate', scope: 'day',
    summary: 'Le dernier éliminé désigne un joueur, qui sera éliminé à moins que deux personnes au moins ne viennent attester de son innocence.',
    howTo: 'Si moins de deux témoins se présentent, utilisez « Élimination manuelle ».', tools: ['eliminate'], automation: [],
  }),
  card({
    id: 'partie-chasse', number: 28, name: 'Partie de chasse', nameStatus: 'traduit', moon: 'immediate', scope: 'day-and-night',
    summary: 'Les joueurs partent chasser jusqu’à l’aube : ni débat ni vote pour eux, on ne peut pas voter contre eux ; la nuit, ils ne peuvent ni dévorer ni être dévorés.',
    howTo: 'N’enregistrez pas de voix contre les chasseurs absents ; refusez une victime parmi eux à l’étape des loups.', tools: [], automation: [], nightReminders: ['wolves'],
  }),
  card({
    id: 'ni-moi-ni-loup', number: 29, name: 'Ni moi, ni loup', nameStatus: 'attesté', moon: 'immediate', scope: 'day',
    summary: 'Par superstition, il est interdit de prononcer « loup » ou « moi ». Celui qui le fait perd sa voix au vote suivant.',
    howTo: 'Retirez les voix des contrevenants au moment du vote.', tools: [], automation: [],
  }),
  card({
    id: 'lundi-morose', number: 30, name: 'Lundi morose', nameStatus: 'traduit', moon: 'immediate', scope: 'day',
    summary: 'Journée triste et sans histoire, sauf si le MJ décide d’appliquer la variante « En tout cas, c’est sûrement pas lui ! ».',
    howTo: 'Tour normal.', tools: [], automation: [],
  }),
  card({
    id: 'cauchemar', number: 31, name: 'Cauchemar', nameStatus: 'traduit', moon: 'immediate', scope: 'day',
    summary: 'Dès le réveil et sans débat, en commençant par le voisin de gauche du dernier éliminé, chacun accuse un joueur ; le plus accusé est éliminé.',
    howTo: 'Utilisez « Vote supplémentaire » et le vote nominatif dans l’ordre des places.', tools: ['extra-vote'], automation: [],
    uncertainty: 'Ce vote s’ajoute-t-il au vote habituel ? L’application l’autorise en plus (outil « Vote supplémentaire »).',
  }),
  ...[1, 2, 3, 4, 5].map((k) =>
    card({
      id: `spiritisme-${k}`, number: 31 + k, name: `Spiritisme n° ${k}`, nameStatus: 'attesté', moon: 'immediate', scope: 'day',
      summary: 'Séance de spiritisme : le Spirite lit les quatre questions de la carte, puis en pose une seule à un défunt, qui répond par oui ou par non.',
      howTo: 'L’application indique le Spirite (joueur à gauche du dernier éliminé) et le défunt qui répond (premier éliminé).',
      tools: [], automation: ['spiritualism'],
      uncertainty: 'Le livret désigne « le premier joueur éliminé » ; le texte de la carte parle de « la première victime des loups ». Les deux sont affichés s’ils diffèrent.',
    }),
  ),
];

const BY_ID = new Map(EVENT_CARDS.map((c) => [c.id, c]));

export function getEventCard(id: string): EventCard | undefined {
  return BY_ID.get(id);
}

export const EVENT_MOON_LABELS: Record<EventMoon, string> = {
  immediate: 'Effet immédiat (pleine lune)',
  delayed: 'Effet différé (croissant de lune)',
  permanent: 'Effet permanent (nouvelle lune)',
};

export const EVENT_TOOL_LABELS: Record<EventTool, string> = {
  'extra-vote': 'Vote supplémentaire',
  revive: 'Ramener en jeu',
  'set-team': 'Changer de camp',
  'grant-use': 'Rendre une potion',
  'remove-mayor': 'Destituer le maire',
  coin: 'Pile ou face',
  spare: 'Gracier le condamné',
  eliminate: 'Élimination manuelle',
};

/** Les cartes Spiritisme sont réservées à la Gitane quand elle est en jeu (règle de l'extension Personnages). */
export function eventDeck(state: GameState): EventCard[] {
  const gypsy = state.players.some((p) => p.originalRoleId === 'gitane' || p.roleId === 'gitane');
  const drawn = new Set(state.events.map((e) => e.cardId));
  return EVENT_CARDS.filter((c) => !drawn.has(c.id) && !(gypsy && c.automation.includes('spiritualism')));
}

/** Un tirage est-il prévu ce matin ? (chaque matin sauf le tout premier, un matin sur 1, 2 ou 3). */
export function eventDrawDue(state: GameState): boolean {
  if (!state.setup.variants.newMoonEvents || state.phase.kind !== 'day') return false;
  const day = state.phase.number;
  if (day < 2 || state.events.some((e) => e.day === day)) return false;
  return (day - 2) % state.setup.variants.eventFrequency === 0;
}

export function canDrawEvent(state: GameState, cardId: string): string | null {
  if (!state.setup.variants.newMoonEvents) return 'La variante Nouvelle Lune n’est pas activée.';
  if (state.phase.kind !== 'day') return 'Les événements se tirent au réveil du village.';
  if (state.phase.number < 2) return 'Aucun événement le tout premier matin.';
  if (state.events.some((e) => e.day === state.dayNumber)) return 'Un événement a déjà été tiré ce matin.';
  if (state.activeBallotId) return 'Tirez l’événement avant les votes.';
  if (!eventDeck(state).some((c) => c.id === cardId)) return 'Carte déjà tirée ou absente de la pioche.';
  return null;
}

/** Ordre chronologique des morts (journal), joueurs encore morts uniquement. */
export function deathOrder(state: GameState): { playerId: PlayerId; cause: string }[] {
  const out: { playerId: PlayerId; cause: string }[] = [];
  for (const e of state.log) {
    if (e.event.type === 'death') out.push({ playerId: e.event.playerId, cause: e.event.cause });
    if (e.event.type === 'revived') {
      const id = e.event.playerId;
      const idx = out.findIndex((d) => d.playerId === id);
      if (idx >= 0) out.splice(idx, 1);
    }
  }
  return out;
}

export function firstEliminated(state: GameState): PlayerId | null {
  return deathOrder(state)[0]?.playerId ?? null;
}

export function lastEliminated(state: GameState): PlayerId | null {
  const d = deathOrder(state);
  return d.length ? d[d.length - 1].playerId : null;
}

export function firstWolfVictim(state: GameState): PlayerId | null {
  return deathOrder(state).find((d) => d.cause === 'wolves' || d.cause === 'big-bad-wolf')?.playerId ?? null;
}

export function lastWolfVictim(state: GameState): PlayerId | null {
  const d = deathOrder(state).filter((x) => x.cause === 'wolves' || x.cause === 'big-bad-wolf');
  return d.length ? d[d.length - 1].playerId : null;
}

/** Spirite d'une carte Événement Spiritisme : joueur vivant à gauche du dernier éliminé. */
export function spiritualist(state: GameState): PlayerId | null {
  const last = lastEliminated(state);
  if (!last) return null;
  return aliveNeighbors(state, last).left?.id ?? null;
}

/** Événements dont l'effet est encore à rappeler au MJ. */
export function activeEvents(state: GameState): { card: EventCard; drawn: GameState['events'][number] }[] {
  const out: { card: EventCard; drawn: GameState['events'][number] }[] = [];
  const day = state.dayNumber;
  for (const d of state.events) {
    const c = getEventCard(d.cardId);
    if (!c) continue;
    const drawnNight = nightAfterDraw(state, d);
    let active = false;
    switch (c.scope) {
      case 'permanent':
        active = true;
        break;
      case 'day':
        active = state.phase.kind === 'day' && day === d.day;
        break;
      case 'day-and-night':
        active = (state.phase.kind === 'day' && day === d.day) || (state.phase.kind === 'night' && state.nightNumber === drawnNight);
        break;
      case 'next-night':
        active = (state.phase.kind === 'day' && day === d.day) || (state.phase.kind === 'night' && state.nightNumber === drawnNight) || (state.phase.kind === 'dawn' && state.nightNumber === drawnNight);
        break;
      case 'next-vote': {
        const confirmed = state.ballots.some((b) => b.kind === 'elimination' && b.status === 'confirmed' && b.round === 1 && b.day >= d.day && ballotAfter(b.id, d.actionIndex, state));
        active = !confirmed || (state.phase.kind === 'day' && day === d.day);
        break;
      }
    }
    if (active) out.push({ card: c, drawn: d });
  }
  return out;
}

function ballotAfter(ballotId: string, actionIndex: number, state: GameState): boolean {
  const opened = state.log.find((e) => e.event.type === 'ballot-opened' && e.event.ballotId === ballotId);
  return opened ? opened.actionIndex > actionIndex : false;
}

/** Numéro de la nuit qui suit le tirage. */
export function nightAfterDraw(_state: GameState, d: GameState['events'][number]): number {
  return d.nightsBefore + 1;
}

export function eventActive(state: GameState, automation: EventAutomation): boolean {
  return activeEvents(state).some((a) => a.card.automation.includes(automation));
}

/** Rappel de la carte en cours pour une étape de nuit. */
export function nightEventReminders(state: GameState, stepKind: string): EventCard[] {
  return activeEvents(state)
    .map((a) => a.card)
    .filter((c) => c.nightReminders?.includes(stepKind));
}

export function playerLabel(state: GameState, id: PlayerId | null): string {
  return findPlayer(state, id)?.name ?? 'personne';
}
