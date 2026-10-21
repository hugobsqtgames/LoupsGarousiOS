import { fuzzGame } from '../fuzz';

/**
 * Tests aléatoires reproductibles : en cas d'échec, le message indique la
 * graine ; `fuzzGame(graine)` rejoue exactement la même séquence.
 */
const SEEDS = Number(process.env.FUZZ_SEEDS ?? 200);

describe('fuzzing du moteur', () => {
  it(`${SEEDS} parties aléatoires respectent les invariants et se rejouent à l’identique`, () => {
    const failures: string[] = [];
    let finished = 0;
    let applied = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const r = fuzzGame(seed);
      applied += r.actionsApplied;
      if (r.finished) finished += 1;
      if (r.violations.length > 0) failures.push(`graine ${seed} : ${r.violations.slice(0, 3).join(' | ')}`);
    }
    expect(failures).toEqual([]);
    // Le générateur doit réellement faire progresser les parties.
    expect(applied).toBeGreaterThan(SEEDS * 30);
    expect(finished).toBeGreaterThan(SEEDS * 0.5);
  });
});
