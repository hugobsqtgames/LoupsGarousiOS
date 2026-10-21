#!/usr/bin/env node
/**
 * Génère les sons de l'application par synthèse procédurale (aucun
 * échantillon externe : les fichiers produits appartiennent au projet).
 * Déterministe : relancer le script produit exactement les mêmes fichiers.
 *
 *   node scripts/generate-audio.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'audio');

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const buf = (seconds) => new Float32Array(Math.round(seconds * RATE));

function envelope(t, attack, release, duration) {
  if (t < attack) return t / attack;
  if (t > duration - release) return Math.max(0, (duration - t) / release);
  return 1;
}

/** Bruit brun filtré (vent). */
function wind(out, gain, seed, lfoHz = 0.07) {
  const r = rng(seed);
  let brown = 0;
  let lp = 0;
  for (let i = 0; i < out.length; i++) {
    brown = (brown + (r() * 2 - 1) * 0.02) * 0.998;
    lp += (brown - lp) * 0.08;
    const t = i / RATE;
    const lfo = 0.55 + 0.45 * Math.sin(2 * Math.PI * lfoHz * t) * Math.sin(2 * Math.PI * lfoHz * 0.37 * t + 1.3);
    out[i] += lp * gain * 6 * lfo;
  }
}

function tone(out, start, dur, freq, gain, { attack = 0.01, release = 0.1, partials = [[1, 1]], vibrato = 0, sweep = 0 } = {}) {
  const s = Math.round(start * RATE);
  const n = Math.round(dur * RATE);
  let phase = partials.map(() => 0);
  for (let i = 0; i < n && s + i < out.length; i++) {
    const t = i / RATE;
    const f = freq * (1 + sweep * (t / dur)) * (1 + vibrato * Math.sin(2 * Math.PI * 6 * t));
    let v = 0;
    partials.forEach(([mult, amp, decay = 0], k) => {
      phase[k] += (2 * Math.PI * f * mult) / RATE;
      v += Math.sin(phase[k]) * amp * Math.exp(-decay * t);
    });
    out[s + i] += v * gain * envelope(t, attack, release, dur);
  }
}

function crickets(out, gain, seed) {
  const r = rng(seed);
  let t = 0.3;
  while (t < out.length / RATE - 1) {
    const chirps = 2 + Math.floor(r() * 3);
    const f = 4300 + r() * 600;
    for (let c = 0; c < chirps; c++) tone(out, t + c * 0.09, 0.05, f, gain * (0.5 + r() * 0.5), { attack: 0.005, release: 0.02 });
    t += 0.6 + r() * 1.4;
  }
}

function owl(out, start, gain) {
  tone(out, start, 0.35, 410, gain, { attack: 0.05, release: 0.2, partials: [[1, 1], [2, 0.15]] });
  tone(out, start + 0.55, 0.25, 380, gain * 0.8, { attack: 0.04, release: 0.15, partials: [[1, 1], [2, 0.12]] });
  tone(out, start + 0.85, 0.6, 395, gain, { attack: 0.06, release: 0.4, partials: [[1, 1], [2, 0.15]], vibrato: 0.01 });
}

function birds(out, gain, seed) {
  const r = rng(seed);
  let t = 0.5;
  while (t < out.length / RATE - 1.2) {
    const notes = 2 + Math.floor(r() * 4);
    const base = 2200 + r() * 1800;
    for (let k = 0; k < notes; k++) {
      tone(out, t + k * 0.13, 0.09, base * (1 + (r() - 0.5) * 0.25), gain * (0.4 + r() * 0.6), { attack: 0.01, release: 0.05, sweep: (r() - 0.3) * 0.5 });
    }
    t += 1.2 + r() * 2.5;
  }
}

function bell(out, start, freq, gain, dur = 2.4) {
  tone(out, start, dur, freq, gain, {
    attack: 0.004,
    release: dur * 0.6,
    partials: [
      [1, 1, 1.6],
      [2.76, 0.45, 2.4],
      [5.4, 0.25, 3.5],
      [8.93, 0.12, 5],
    ],
  });
}

/** Fondu enchaîné fin → début pour une boucle sans clic. */
function makeLoop(out, fade = 1.5) {
  const n = Math.round(fade * RATE);
  const res = out.slice(0, out.length - n);
  for (let i = 0; i < n; i++) {
    const a = i / n;
    res[i] = res[i] * a + out[out.length - n + i] * (1 - a);
  }
  return res;
}

function normalize(out, peak = 0.85) {
  let max = 0;
  for (const v of out) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < out.length; i++) out[i] = (out[i] / max) * peak;
  return out;
}

function writeWav(name, data) {
  const bytes = Buffer.alloc(44 + data.length * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + data.length * 2, 4);
  bytes.write('WAVE', 8);
  bytes.write('fmt ', 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(RATE, 24);
  bytes.writeUInt32LE(RATE * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i])) * 32767), 44 + i * 2);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, name), bytes);
  console.log(`${name}  ${(bytes.length / 1024).toFixed(0)} Kio  ${(data.length / RATE).toFixed(2)} s`);
}

// --- Ambiances (boucles) ---
{
  const a = buf(25.5);
  wind(a, 0.9, 11);
  crickets(a, 0.05, 12);
  owl(a, 6.2, 0.12);
  owl(a, 17.4, 0.09);
  writeWav('ambient-night.wav', normalize(makeLoop(a), 0.6));
}
{
  const a = buf(25.5);
  wind(a, 0.45, 21, 0.11);
  birds(a, 0.09, 22);
  writeWav('ambient-day.wav', normalize(makeLoop(a), 0.55));
}

// --- Effets ---
{
  const a = buf(3);
  tone(a, 0, 3, 55, 0.5, { attack: 0.6, release: 1.6, partials: [[1, 1], [1.5, 0.35], [2.01, 0.25]] });
  wind(a, 0.4, 31, 0.3);
  bell(a, 0.3, 196, 0.35, 2.6);
  writeWav('sfx-nightfall.wav', normalize(a));
}
{
  const a = buf(3);
  bell(a, 0, 523.25, 0.5);
  bell(a, 0.18, 659.25, 0.4);
  bell(a, 0.36, 783.99, 0.35);
  writeWav('sfx-daybreak.wav', normalize(a));
}
{
  const a = buf(0.25);
  tone(a, 0, 0.25, 880, 0.6, { attack: 0.003, release: 0.2, partials: [[1, 1, 18], [2, 0.3, 25]] });
  writeWav('sfx-confirm.wav', normalize(a, 0.7));
}
{
  const a = buf(0.09);
  const r = rng(41);
  for (let i = 0; i < a.length; i++) a[i] = (r() * 2 - 1) * Math.exp(-i / (RATE * 0.008)) * 0.6;
  tone(a, 0, 0.09, 760, 0.5, { attack: 0.001, release: 0.06, partials: [[1, 1, 40]] });
  writeWav('sfx-vote.wav', normalize(a, 0.7));
}
{
  const a = buf(0.22);
  tone(a, 0, 0.22, 660, 0.6, { attack: 0.005, release: 0.12, sweep: -0.45 });
  writeWav('sfx-undo.wav', normalize(a, 0.6));
}
{
  const a = buf(0.6);
  tone(a, 0, 0.25, 587.33, 0.5, { attack: 0.01, release: 0.15, partials: [[1, 1, 6], [2, 0.2, 8]] });
  tone(a, 0.22, 0.38, 739.99, 0.5, { attack: 0.01, release: 0.25, partials: [[1, 1, 5], [2, 0.2, 8]] });
  writeWav('sfx-alert.wav', normalize(a, 0.65));
}
{
  const a = buf(0.9);
  bell(a, 0, 1046.5, 0.4, 0.9);
  writeWav('sfx-step.wav', normalize(a, 0.5));
}
{
  const a = buf(3.2);
  [261.63, 329.63, 392, 523.25].forEach((f, i) => tone(a, i * 0.16, 2.8 - i * 0.16, f, 0.35, { attack: 0.02, release: 1.6, partials: [[1, 1, 0.6], [2, 0.3, 1], [3, 0.12, 1.5]] }));
  writeWav('sfx-victory.wav', normalize(a));
}
