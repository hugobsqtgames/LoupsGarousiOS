import { SaveScheduler, type SaveState } from './save-scheduler';

function deferred() {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('SaveScheduler', () => {
  it('n’annonce « saved » qu’après la réussite de l’écriture', async () => {
    const d = deferred();
    const states: SaveState[] = [];
    const s = new SaveScheduler<number>(() => d.promise, (st) => states.push(st));
    s.request(1, 1);
    expect(s.current.status).toBe('saving');
    d.resolve();
    await s.flush();
    expect(s.current).toMatchObject({ status: 'saved', savedVersion: 1 });
  });

  it('ne garde que la dernière version pendant une écriture en cours', async () => {
    const written: number[] = [];
    const gates = [deferred(), deferred()];
    let call = 0;
    const s = new SaveScheduler<number>(async (v) => {
      const g = gates[call++];
      await g.promise;
      written.push(v);
    }, () => undefined);
    s.request(1, 1);
    s.request(2, 2);
    s.request(3, 3);
    gates[0].resolve();
    gates[1].resolve();
    await s.flush();
    expect(written).toEqual([1, 3]);
    expect(s.current.savedVersion).toBe(3);
  });

  it('signale une erreur sans prétendre avoir sauvegardé, puis permet de réessayer', async () => {
    let fail = true;
    const s = new SaveScheduler<number>(async () => {
      if (fail) throw new Error('disque plein');
    }, () => undefined);
    s.request(5, 5);
    await s.flush();
    expect(s.current).toMatchObject({ status: 'error', error: 'disque plein', savedVersion: -1 });
    fail = false;
    s.retry();
    await s.flush();
    expect(s.current).toMatchObject({ status: 'saved', savedVersion: 5 });
  });
});
