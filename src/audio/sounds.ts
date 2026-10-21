/** Catalogue des sons embarqués (générés par scripts/generate-audio.mjs). */
export const AMBIENTS = {
  night: require('../../assets/audio/ambient-night.wav'),
  day: require('../../assets/audio/ambient-day.wav'),
} as const;

export const EFFECTS = {
  nightfall: require('../../assets/audio/sfx-nightfall.wav'),
  daybreak: require('../../assets/audio/sfx-daybreak.wav'),
  confirm: require('../../assets/audio/sfx-confirm.wav'),
  vote: require('../../assets/audio/sfx-vote.wav'),
  undo: require('../../assets/audio/sfx-undo.wav'),
  alert: require('../../assets/audio/sfx-alert.wav'),
  step: require('../../assets/audio/sfx-step.wav'),
  victory: require('../../assets/audio/sfx-victory.wav'),
} as const;

export type AmbientName = keyof typeof AMBIENTS;
export type EffectName = keyof typeof EFFECTS;
