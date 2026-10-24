import { DEFAULT_VARIANTS, fuzzPlay, VARIANT_OPTIONS, type Variants } from '@/engine';
import { persistRoundTrip } from './helpers';
import { replay } from '@/engine';

/**
 * Campagne QA — combinatoire des variantes : chaque valeur de chaque option
 * est imposée sur plusieurs parties aléatoires (le reste reste aléatoire).
 */
const SEEDS_PER_VALUE = 8;

const cases: [string, string, Partial<Variants>, number][] = [];
for (const opt of VARIANT_OPTIONS) {
  const values: unknown[] = opt.choices ? opt.choices.map((c) => c.value) : typeof DEFAULT_VARIANTS[opt.key] === 'boolean' ? [true, false] : [DEFAULT_VARIANTS[opt.key]];
  for (const v of values) {
    for (let s = 1; s <= SEEDS_PER_VALUE; s++) cases.push([opt.key, String(v), { [opt.key]: v } as Partial<Variants>, 5000 + s * 97 + cases.length]);
  }
}

describe.each(cases)('%s = %s', (_key, _value, override, seed) => {
  it(`graine ${seed} : invariants, rejeu identique après relecture`, () => {
    const { report, record, state } = fuzzPlay(seed, 300, override);
    expect(report.violations).toEqual([]);
    for (const [k, v] of Object.entries(override)) expect(state.setup.variants[k as keyof Variants]).toBe(v);
    const res = replay(persistRoundTrip(record));
    expect(res.failure).toBeNull();
    expect(JSON.stringify(res.state)).toBe(JSON.stringify(state));
  });
});

/** Paires de variantes à risque (interactions de règles), toutes combinaisons de valeurs. */
const PAIRS: [keyof Variants, keyof Variants][] = [
  ['mayorEnabled', 'eliminationTie'],
  ['scapegoatOnTie', 'eliminationTie'],
  ['mayorTie', 'mayorSuccession'],
  ['voteMode', 'strictVoterCount'],
  ['servantEnabled', 'idiotDiesSecondTime'],
  ['elderVengeance', 'elderTakesIdiot'],
  ['newMoonEvents', 'eventFrequency'],
  ['angelWindow', 'angelStartsWithDay'],
  ['whiteWolfNights', 'bigBadWolfRule'],
  ['witchSelfHeal', 'salvateurSelf'],
];

function valuesOf(key: keyof Variants): unknown[] {
  const opt = VARIANT_OPTIONS.find((o) => o.key === key)!;
  if (opt.choices) return opt.choices.map((c) => c.value);
  return typeof DEFAULT_VARIANTS[key] === 'boolean' ? [true, false] : [DEFAULT_VARIANTS[key]];
}

const pairCases: [string, Partial<Variants>, number][] = [];
for (const [a, b] of PAIRS) {
  for (const va of valuesOf(a)) for (const vb of valuesOf(b)) for (let s = 0; s < 4; s++) pairCases.push([`${a}=${String(va)} × ${b}=${String(vb)}`, { [a]: va, [b]: vb } as Partial<Variants>, 90_000 + pairCases.length * 13]);
}

describe.each(pairCases)('%s', (_label, override, seed) => {
  it(`graine ${seed}`, () => {
    const { report } = fuzzPlay(seed, 300, override);
    expect(report.violations).toEqual([]);
  });
});
