import type { NightStep, RoleRegistry, StepKind } from '@/engine';

/** Textes que le MJ lit à voix haute (ou que la narration prononce). */
const WAKE: Record<Exclude<StepKind, 'custom' | 'bluff'>, string> = {
  thief: 'Voleur, réveille-toi. Regarde les deux cartes au centre et échange ta carte si tu le souhaites.',
  comedian: 'Comédien, réveille-toi. Choisis la carte dont tu emprunteras le pouvoir cette nuit.',
  wolfhound: 'Chien-loup, réveille-toi. Resteras-tu un villageois, ou rejoindras-tu la meute ?',
  cupid: 'Cupidon, réveille-toi. Désigne les deux joueurs qui tomberont amoureux.',
  lovers: 'Je vais toucher les Amoureux. Amoureux, réveillez-vous, reconnaissez-vous, puis rendormez-vous.',
  'wild-child': 'Enfant sauvage, réveille-toi. Désigne ton modèle.',
  sisters: 'Les Deux Sœurs, réveillez-vous et reconnaissez-vous.',
  brothers: 'Les Trois Frères, réveillez-vous et reconnaissez-vous.',
  salvateur: 'Salvateur, réveille-toi. Qui veux-tu protéger cette nuit ?',
  seer: 'Voyante, réveille-toi. Désigne le joueur dont tu veux connaître la véritable identité.',
  fox: 'Renard, réveille-toi. Désigne le joueur au centre du groupe que tu veux flairer.',
  wolves: 'Loups-Garous, réveillez-vous. Mettez-vous d’accord et désignez votre victime.',
  infect: 'Infect Père des Loups, veux-tu infecter la victime plutôt que de la dévorer ?',
  'white-wolf': 'Loup-Garou blanc, réveille-toi. Veux-tu dévorer l’un des loups ?',
  'big-bad-wolf': 'Grand Méchant Loup, réveille-toi. Désigne une seconde victime.',
  witch: 'Sorcière, réveille-toi. Voici la victime de cette nuit. Veux-tu utiliser l’une de tes potions ?',
  piper: 'Joueur de flûte, réveille-toi. Désigne les deux joueurs que tu veux charmer.',
  charmed: 'Je vais toucher les joueurs charmés. Charmés, réveillez-vous, reconnaissez-vous, puis rendormez-vous.',
  raven: 'Corbeau, réveille-toi. Désigne le joueur que tu soupçonnes.',
};

const SLEEP: Partial<Record<StepKind, string>> = {
  thief: 'Voleur, rendors-toi.',
  comedian: 'Comédien, rendors-toi.',
  wolfhound: 'Chien-loup, rendors-toi.',
  cupid: 'Cupidon, rendors-toi.',
  'wild-child': 'Enfant sauvage, rendors-toi.',
  sisters: 'Les Deux Sœurs, rendormez-vous.',
  brothers: 'Les Trois Frères, rendormez-vous.',
  salvateur: 'Salvateur, rendors-toi.',
  seer: 'Voyante, rendors-toi.',
  fox: 'Renard, rendors-toi.',
  wolves: 'Loups-Garous, rendormez-vous.',
  'white-wolf': 'Loup-Garou blanc, rendors-toi.',
  'big-bad-wolf': 'Grand Méchant Loup, rendors-toi.',
  witch: 'Sorcière, rendors-toi.',
  piper: 'Joueur de flûte, rendors-toi.',
  raven: 'Corbeau, rendors-toi.',
};

export function wakeScript(step: NightStep, registry: RoleRegistry): string {
  if (step.kind === 'custom' || step.kind === 'bluff') {
    const name = step.roleId && registry.has(step.roleId) ? registry.get(step.roleId).name : 'Rôle';
    return `${name}, réveille-toi.`;
  }
  return WAKE[step.kind];
}

export function sleepScript(step: NightStep, registry: RoleRegistry): string | null {
  if (step.kind === 'custom' || step.kind === 'bluff') {
    const name = step.roleId && registry.has(step.roleId) ? registry.get(step.roleId).name : null;
    return name ? `${name}, rendors-toi.` : null;
  }
  return SLEEP[step.kind] ?? null;
}

export function stepTitle(step: NightStep, registry: RoleRegistry, titles: Record<StepKind, string>): string {
  if ((step.kind === 'custom' || step.kind === 'bluff') && step.roleId && registry.has(step.roleId)) return registry.get(step.roleId).name;
  return titles[step.kind];
}
