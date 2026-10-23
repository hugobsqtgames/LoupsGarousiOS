import { countBallot } from './ballot';
import { activeEvents, eventActive, getEventCard } from './events';
import { DEATH_CAUSE_LABELS, describeOutcome, nameOf } from './format';
import { hashString } from './rng';
import { bigBadWolfBlocked, eligibleVoters, findPlayer, hasPowers, loverOf, phaseLabel, registryOf, roleName, whiteWolfNight } from './selectors';
import type { DeathCause, GameState, LogEntry, PlayerId, RoleId, StepKind } from './types';

/* ------------------------------------------------------------------ */
/* Annonce de l'aube prête à lire                                       */
/* ------------------------------------------------------------------ */

export type AnnouncementStyle = 'sobre' | 'dramatique' | 'conte' | 'humour';

export const ANNOUNCEMENT_STYLES: { value: AnnouncementStyle; label: string }[] = [
  { value: 'sobre', label: 'Sobre' },
  { value: 'dramatique', label: 'Drame' },
  { value: 'conte', label: 'Conte' },
  { value: 'humour', label: 'Humour' },
];

interface PublicDeath {
  playerId: PlayerId;
  cause: DeathCause;
  roleId: RoleId;
}

const OPENINGS: Record<AnnouncementStyle, string[]> = {
  sobre: ['Le jour se lève sur le village.', 'C’est le matin, le village se réveille.'],
  dramatique: [
    'Une aube livide se lève sur Thiercelieux, et le silence pèse sur les toits.',
    'Le coq hésite à chanter : quelque chose de terrible s’est produit cette nuit.',
    'La brume se dissipe lentement… et révèle l’horreur.',
  ],
  conte: [
    'Il était une fois un petit village qui s’éveillait, les paupières encore lourdes de rêves.',
    'Ce matin-là, le soleil glissa ses premiers rayons entre les volets de Thiercelieux.',
  ],
  humour: [
    'Debout là-dedans ! Le café est chaud, mais certains ne le boiront plus.',
    'Bonjour Thiercelieux ! Petit point météo : ciel clair, risque de crocs élevé.',
  ],
};

const NOBODY: Record<AnnouncementStyle, string[]> = {
  sobre: ['Personne n’a été éliminé cette nuit.'],
  dramatique: ['Contre toute attente, tous les villageois sont là. La nuit a épargné le village… pour cette fois.'],
  conte: ['Par miracle, chacun retrouva son lit au matin, et personne ne manquait à l’appel.'],
  humour: ['Tout le monde est là ! Les loups étaient au régime, apparemment.'],
};

const DEATH_LINE: Record<AnnouncementStyle, ((name: string) => string)[]> = {
  sobre: [(n) => `${n} a été éliminé(e) cette nuit.`],
  dramatique: [
    (n) => `On a retrouvé ${n}, immobile, au petit matin.`,
    (n) => `Un cri déchire le village : ${n} ne se relèvera pas.`,
  ],
  conte: [(n) => `Hélas, ${n} ne se réveilla pas de son long sommeil.`, (n) => `Le lit de ${n} était froid, et la porte grande ouverte.`],
  humour: [(n) => `${n} a définitivement raté son réveil.`, (n) => `Minute de silence pour ${n}, qui ne viendra pas au petit-déjeuner.`],
};

const HEARTBREAK: Record<AnnouncementStyle, (name: string) => string> = {
  sobre: (n) => `${n} est mort(e) de chagrin.`,
  dramatique: (n) => `Fou de douleur, ${n} n’a pas survécu à la perte de l’être aimé.`,
  conte: (n) => `Et ${n}, le cœur brisé, s’éteignit à son tour.`,
  humour: (n) => `${n} n’a pas supporté la nouvelle : mort(e) de chagrin, c’est romantique au moins.`,
};

const BEAR: Record<AnnouncementStyle, [string, string]> = {
  sobre: ['L’ours du Montreur grogne.', 'L’ours du Montreur reste silencieux.'],
  dramatique: ['Grrr… L’ours tire sur sa chaîne et gronde sourdement : le danger est tout proche !', 'L’ours dort paisiblement, indifférent.'],
  conte: ['L’ours, flairant quelque chose, se mit à grogner doucement.', 'L’ours, lui, ronflait comme un bienheureux.'],
  humour: ['L’ours grogne. Il n’a pas eu son miel, ou alors il sent quelque chose…', 'L’ours ronfle. Rien à signaler côté plantigrade.'],
};

const CLOSINGS: Record<AnnouncementStyle, string[]> = {
  sobre: ['Le village peut débattre.'],
  dramatique: ['Qui parmi vous porte le masque du loup ? Le village doit se décider.', 'La peur s’installe. Il faut agir, et vite.'],
  conte: ['Alors les villageois se réunirent sur la place, bien décidés à trouver les coupables.'],
  humour: ['Allez, place au débat ! Et on évite de s’accuser juste parce que quelqu’un ronfle.'],
};

function pickFrom<T>(list: readonly T[], seed: string): T {
  return list[parseInt(hashString(seed), 16) % list.length];
}

function publicDeaths(report: readonly LogEntry[]): PublicDeath[] {
  const out: PublicDeath[] = [];
  for (const e of report) if (e.event.type === 'death') out.push({ playerId: e.event.playerId, cause: e.event.cause, roleId: e.event.roleId });
  return out;
}

export interface Announcement {
  paragraphs: string[];
  /** Morts annoncées (pour l'affichage détaillé). */
  deaths: { playerId: PlayerId; name: string; role: string | null }[];
}

/**
 * Texte public de l'aube, prêt à lire. N'utilise que les informations que le
 * MJ annonce normalement : noms des victimes et (si l'option est active et
 * qu'aucun événement ne l'interdit) leur carte ; jamais la cause d'une mort
 * nocturne (qui trahirait la Sorcière), sauf la mort de chagrin, publique.
 */
export function dawnAnnouncement(state: GameState, style: AnnouncementStyle, opts: { revealRoles: boolean; report?: readonly LogEntry[] } = { revealRoles: true }): Announcement {
  const report = opts.report ?? state.dawnReport;
  const seed = `${state.setup.id}:${state.nightNumber}:${style}`;
  const paragraphs: string[] = [pickFrom(OPENINGS[style], seed)];
  const deaths = publicDeaths(report);
  const buried = eventActive(state, 'hide-wolf-victim-roles');
  const shown: Announcement['deaths'] = [];
  if (deaths.length === 0) paragraphs.push(pickFrom(NOBODY[style], seed + 'n'));
  deaths.forEach((d, i) => {
    const name = nameOf(state, d.playerId);
    const hideRole = !opts.revealRoles || (buried && (d.cause === 'wolves' || d.cause === 'big-bad-wolf' || d.cause === 'white-wolf'));
    const role = hideRole ? null : roleName(state, d.roleId);
    let line = d.cause === 'heartbreak' ? HEARTBREAK[style](name) : pickFrom(DEATH_LINE[style], `${seed}:${i}`)(name);
    if (role) line += ` ${style === 'humour' ? 'Sa carte ? ' : 'Sa carte : '}${role}.`;
    paragraphs.push(line);
    shown.push({ playerId: d.playerId, name, role });
  });
  for (const e of report) {
    if (e.event.type === 'bear') paragraphs.push(BEAR[style][e.event.growled ? 0 : 1]);
    if (e.event.type === 'spiritualism' && e.event.source === 'gypsy') {
      paragraphs.push(
        e.event.answererId
          ? `${e.event.askerId ? nameOf(state, e.event.askerId) : 'Le Spirite désigné'} va poser une question à ${nameOf(state, e.event.answererId)}, qui répondra depuis l’au-delà par oui ou par non.`
          : 'Une séance de spiritisme était prévue, mais aucun esprit ne peut encore répondre.',
      );
    }
  }
  paragraphs.push(pickFrom(CLOSINGS[style], seed + 'c'));
  return { paragraphs, deaths: shown };
}

/* ------------------------------------------------------------------ */
/* Rappels contextuels                                                  */
/* ------------------------------------------------------------------ */

export interface Reminder {
  id: string;
  tone: 'info' | 'warning';
  text: string;
}

/**
 * Rappels utiles au MJ, calculés à partir de l'état. `step` restreint aux
 * rappels de l'étape de nuit affichée ; sans `step`, rappels généraux du jour
 * ou de la nuit (tableau de bord).
 */
export function reminders(state: GameState, step?: { kind: StepKind; actorIds: PlayerId[]; bluff: boolean; roleId: RoleId | null }): Reminder[] {
  const out: Reminder[] = [];
  const add = (id: string, text: string, tone: Reminder['tone'] = 'info') => out.push({ id, text, tone });
  const players = state.players;
  const actor = step?.actorIds[0] ? findPlayer(state, step.actorIds[0]) : undefined;

  if (step) {
    switch (step.kind) {
      case 'witch':
        if (actor && (actor.uses.heal ?? 0) === 0) add('witch-heal', 'La Sorcière n’a plus de potion de vie : montrez-lui la victime seulement pour la forme.');
        if (actor && (actor.uses.poison ?? 0) === 0) add('witch-poison', 'La Sorcière n’a plus de potion de mort.');
        break;
      case 'salvateur':
        if (actor?.lastProtected && state.setup.variants.salvateurNoRepeat) add('salv-repeat', `Le Salvateur ne peut pas protéger ${nameOf(state, actor.lastProtected)} (protégé(e) la nuit dernière).`);
        if (players.some((p) => p.alive && p.roleId === 'petite-fille')) add('salv-girl', 'Sa protection est sans effet sur la Petite Fille si les loups la surprennent.');
        break;
      case 'wolves': {
        if (players.some((p) => p.alive && p.roleId === 'petite-fille')) add('girl', 'Petite Fille en jeu : personne ne doit cacher son visage. Si elle est surprise, cochez la case : elle meurt à la place de la victime.');
        const elder = players.find((p) => p.alive && p.roleId === 'ancien' && (p.uses.extraLife ?? 0) === 0);
        if (elder) add('elder-life', 'L’Ancien a déjà perdu sa vie supplémentaire : une nouvelle attaque le tuera.');
        if (state.rustyCurse?.night === state.nightNumber) add('rusty', `${nameOf(state, state.rustyCurse.wolfId)} mourra cette nuit de la blessure de l’épée rouillée (annonce au matin).`, 'warning');
        break;
      }
      case 'infect':
        if (actor && (actor.uses.infect ?? 0) === 0) add('infect-used', 'L’infection a déjà été utilisée.');
        add('infect-elder', 'L’Ancien n’est pas affecté par l’infection.');
        break;
      case 'big-bad-wolf':
        add('bbw', 'Il perd sa seconde victime dès qu’un loup est éliminé.');
        break;
      case 'fox':
        add('fox', 'S’il ne trouve aucun loup dans le groupe, il perd définitivement son flair.');
        break;
      case 'gypsy':
        if (actor) add('gypsy-cards', `Cartes Spiritisme restantes : ${5 - actor.spiritCardsUsed.length} (déjà utilisées : ${actor.spiritCardsUsed.join(', ') || 'aucune'}).`);
        break;
      case 'piper': {
        const charmed = players.filter((p) => p.alive && p.charmed).length;
        add('piper', `Joueurs charmés vivants : ${charmed} sur ${players.filter((p) => p.alive).length - 1}.`);
        break;
      }
      case 'white-wolf':
        add('white', 'Le Loup-Garou blanc ne gagne que s’il est le dernier survivant.');
        break;
      default:
        break;
    }
    if (step.bluff) add('bluff', 'Rôle absent, mort ou privé de pouvoir : appelez-le quand même, pour ne rien révéler.');
    for (const a of activeEvents(state)) {
      if (a.card.nightReminders?.includes(step.kind)) add(`event-${a.card.id}`, `Événement « ${a.card.name} » : ${a.card.howTo}`, 'warning');
    }
    return out;
  }

  // Rappels généraux.
  if (state.villagePowersLost) add('powers-lost', 'L’Ancien a été tué par le village : les villageois ont perdu leurs pouvoirs.', 'warning');
  const bbw = players.find((p) => p.alive && p.roleId === 'grand-mechant-loup');
  if (bbw && bigBadWolfBlocked(state)) add('bbw-lost', 'Le Grand Méchant Loup a perdu son pouvoir (un loup a été éliminé).');
  const fox = players.find((p) => p.alive && p.roleId === 'renard' && p.foxPowerLost);
  if (fox) add('fox-lost', 'Le Renard a perdu son flair.');
  const witch = players.find((p) => p.alive && p.roleId === 'sorciere');
  if (witch && (witch.uses.heal ?? 0) === 0 && (witch.uses.poison ?? 0) === 0) add('witch-empty', 'La Sorcière a utilisé ses deux potions : appelez-la quand même pour la forme.');
  if (state.mayorAbolished) add('mayor-abolished', 'Le poste de maire est perdu définitivement (Idiot du village).');
  const idiots = players.filter((p) => p.alive && p.idiotRevealed);
  for (const p of idiots) add(`idiot-${p.id}`, `${p.name} (Idiot révélé) ne vote plus.`);
  if (state.ravenMark && state.ravenMark.day === state.dayNumber && state.phase.kind === 'day') {
    add('raven', `Corbeau : ${state.setup.variants.ravenBonus} voix de plus contre ${nameOf(state, state.ravenMark.targetId)} au premier vote.`);
  }
  if (state.restrictedVoters && state.restrictedVoters.day === state.dayNumber && state.phase.kind === 'day') {
    const v = state.restrictedVoters.voters;
    add('scapegoat', v.length ? `Bouc émissaire : seuls ${v.map((id) => nameOf(state, id)).join(', ')} votent aujourd’hui.` : 'Bouc émissaire : personne ne vote aujourd’hui.', 'warning');
  }
  if (state.lovers && state.phase.kind === 'day') add('lovers', 'Les Amoureux ne peuvent pas voter l’un contre l’autre.');
  if (state.rustyCurse) add('rusty', `${nameOf(state, state.rustyCurse.wolfId)} mourra la nuit prochaine (épée rouillée).`, 'warning');
  const judge = players.find((p) => p.alive && p.roleId === 'juge-begue' && hasPowers(state, p) && (p.uses.judge ?? 0) > 0);
  if (judge && state.phase.kind === 'day') add('judge', 'Le Juge bègue peut encore imposer un second vote : surveillez son signe.');
  const angel = players.find((p) => p.alive && p.roleId === 'ange' && p.team === 'solo');
  if (angel && !loverOf(state, angel.id)) add('angel', 'Ange en jeu : s’il est éliminé au premier tour, il gagne seul.');
  const white = players.find((p) => p.alive && p.roleId === 'loup-blanc');
  if (white && state.phase.kind !== 'night' && whiteWolfNight(state, state.nightNumber + 1)) add('white-next', 'La nuit prochaine, le Loup-Garou blanc se réveille seul.');
  if (state.spiritQuestion && state.phase.kind === 'day' && state.spiritQuestion.night === state.nightNumber) {
    add('spirit', `Spiritisme : ${nameOf(state, state.spiritQuestion.askerId)} pose la question ${state.spiritQuestion.question} de la carte n° ${state.spiritQuestion.card}.`);
  }
  for (const a of activeEvents(state)) add(`event-${a.card.id}`, `Événement « ${a.card.name} » : ${a.card.summary}`, a.card.scope === 'permanent' ? 'info' : 'warning');
  return out;
}

/* ------------------------------------------------------------------ */
/* Chronologie visuelle                                                 */
/* ------------------------------------------------------------------ */

export type TimelineItemKind = 'death' | 'vote' | 'mayor' | 'event' | 'info' | 'secret' | 'victory' | 'revived';

export interface TimelineItem {
  key: string;
  kind: TimelineItemKind;
  text: string;
  secret: boolean;
  playerIds: PlayerId[];
}

export interface TimelinePhase {
  label: string;
  kind: 'night' | 'day' | 'other';
  items: TimelineItem[];
}

/** Chronologie par phase : morts, votes, maires, événements, informations secrètes (masquables). */
export function buildTimeline(state: GameState): TimelinePhase[] {
  const phases: TimelinePhase[] = [];
  let current: TimelinePhase | null = null;
  const reg = registryOf(state);
  const r = (id: RoleId) => (reg.has(id) ? reg.get(id).name : id);
  const n = (id: PlayerId | null | undefined) => nameOf(state, id);
  const ensure = (label: string) => {
    const kind: TimelinePhase['kind'] = label.startsWith('Nuit') || label.startsWith('Aube') ? 'night' : label.startsWith('Jour') ? 'day' : 'other';
    const groupLabel = label.startsWith('Aube') ? label.replace('Aube', 'Nuit') : label;
    if (!current || current.label !== groupLabel) {
      current = { label: groupLabel, kind, items: [] };
      phases.push(current);
    }
    return current;
  };
  for (const e of state.log) {
    const ev = e.event;
    const push = (kind: TimelineItemKind, text: string, ids: PlayerId[] = [], secret = e.secret) =>
      ensure(e.phaseLabel).items.push({ key: `${e.seq}`, kind, text, secret, playerIds: ids });
    switch (ev.type) {
      case 'death':
        push('death', `${n(ev.playerId)} (${r(ev.roleId)}) — ${DEATH_CAUSE_LABELS[ev.cause]}`, [ev.playerId], false);
        break;
      case 'revived':
        push('revived', `${n(ev.playerId)} revient en jeu`, [ev.playerId], false);
        break;
      case 'ballot-opened': {
        const b = state.ballots.find((x) => x.id === ev.ballotId);
        if (b && b.status === 'confirmed' && b.result) {
          const count = countBallot(b);
          const votes = Object.values(count.tallies).reduce((a, v) => a + v, 0) + count.blank;
          const what = b.kind === 'mayor' ? 'Élection du maire' : b.round > 1 ? 'Second tour' : 'Vote du village';
          push('vote', `${what} : ${describeOutcome(state, b.result.outcome)} (${votes} voix)`, b.result.leaders, false);
        }
        break;
      }
      case 'mayor':
        if (ev.how !== 'elected') push('mayor', ev.how === 'removed' ? 'Le village n’a plus de maire' : `${n(ev.playerId)} devient maire`, ev.playerId ? [ev.playerId] : [], false);
        break;
      case 'idiot-revealed':
        push('info', `${n(ev.playerId)} est l’Idiot du village : épargné(e)`, [ev.playerId], false);
        break;
      case 'elder-vengeance':
        push('info', 'Les villageois perdent leurs pouvoirs (Ancien)', [ev.playerId], false);
        break;
      case 'bear':
        push('info', ev.growled ? 'L’ours grogne' : 'L’ours reste silencieux', [ev.tamerId], false);
        break;
      case 'event-drawn':
        push('event', `Événement : ${getEventCard(ev.cardId)?.name ?? ev.cardId}`, [], false);
        break;
      case 'victory':
        push('victory', `Victoire : ${ev.victory.reason}`, ev.victory.winners, false);
        break;
      case 'lovers':
        push('secret', `Amoureux : ${n(ev.lovers[0])} et ${n(ev.lovers[1])}`, [...ev.lovers], true);
        break;
      case 'seer':
        push('secret', `Voyante : ${n(ev.targetId)} est ${r(ev.roleId)}`, [ev.targetId], true);
        break;
      case 'potion':
        push('secret', ev.kind === 'heal' ? `Potion de vie sur ${n(ev.targetId)}` : `Potion de mort sur ${n(ev.targetId)}`, [ev.targetId], true);
        break;
      case 'protected':
        push('secret', `Protection de ${n(ev.targetId)}`, [ev.targetId], true);
        break;
      case 'infected':
        push('secret', `${n(ev.targetId)} est infecté(e)`, [ev.targetId], true);
        break;
      case 'transformed':
        if (ev.reason === 'wild-child') push('secret', `${n(ev.playerId)} (Enfant sauvage) devient loup`, [ev.playerId], true);
        break;
      case 'team-changed':
        push('secret', `${n(ev.playerId)} passe dans le camp ${ev.team === 'wolves' ? 'des loups' : 'du village'}`, [ev.playerId], true);
        break;
      case 'servant':
        push('secret', `La Servante (${n(ev.servantId)}) prend le rôle ${r(ev.roleId)}`, [ev.servantId], true);
        break;
      case 'charmed':
        push('secret', `Charmés : ${ev.targetIds.map(n).join(', ')}`, ev.targetIds, true);
        break;
      case 'thief-swap':
        push('secret', `Le Voleur (${n(ev.playerId)}) devient ${r(ev.to)}`, [ev.playerId], true);
        break;
      default:
        break;
    }
  }
  return phases.filter((p) => p.items.length > 0);
}

/** Libellé court de la phase courante (en-tête des écrans). */
export function currentPhaseLabel(state: GameState): string {
  return phaseLabel(state.phase);
}

/** Votants attendus du scrutin courant (pour la saisie à main levée). */
export function expectedVoters(state: GameState): number {
  return eligibleVoters(state).length;
}
