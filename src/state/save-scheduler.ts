export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SaveState {
  status: SaveStatus;
  error: string | null;
  /** Nombre d'actions effectivement écrites lors de la dernière sauvegarde réussie. */
  savedVersion: number;
  savedAt: string | null;
}

/**
 * Sauvegarde automatique « dernière version gagnante » : une seule écriture
 * à la fois ; si de nouvelles données arrivent pendant une écriture, seule
 * la plus récente est écrite ensuite. Le statut « saved » n'est publié
 * qu'après la réussite effective de l'écriture.
 */
export class SaveScheduler<T> {
  private inFlight = false;
  private pending: { version: number; data: T } | null = null;
  private state: SaveState = { status: 'idle', error: null, savedVersion: -1, savedAt: null };
  private idleWaiters: (() => void)[] = [];
  private lastFailed: { version: number; data: T } | null = null;

  constructor(
    private readonly write: (data: T) => Promise<void>,
    private readonly onChange: (s: SaveState) => void,
  ) {}

  get current(): SaveState {
    return this.state;
  }

  request(version: number, data: T): void {
    this.pending = { version, data };
    this.publish({ ...this.state, status: 'saving' });
    if (!this.inFlight) void this.loop();
  }

  /** Résout lorsque toutes les écritures demandées sont terminées. */
  flush(): Promise<void> {
    if (!this.inFlight && !this.pending) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  private publish(s: SaveState): void {
    this.state = s;
    this.onChange(s);
  }

  private async loop(): Promise<void> {
    this.inFlight = true;
    while (this.pending) {
      const job = this.pending;
      this.pending = null;
      try {
        await this.write(job.data);
        this.lastFailed = null;
        this.publish({ status: this.pending ? 'saving' : 'saved', error: null, savedVersion: job.version, savedAt: new Date().toISOString() });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        // La donnée est conservée pour « Réessayer » (ou remplacée par la prochaine action).
        this.lastFailed = job;
        this.publish({ ...this.state, status: 'error', error: message });
      }
    }
    this.inFlight = false;
    const waiters = this.idleWaiters;
    this.idleWaiters = [];
    for (const w of waiters) w();
  }

  /** Relance la dernière écriture échouée. */
  retry(): void {
    if (this.lastFailed && !this.pending) {
      const job = this.lastFailed;
      this.lastFailed = null;
      this.request(job.version, job.data);
    }
  }
}
