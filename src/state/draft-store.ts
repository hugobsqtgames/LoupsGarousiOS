import { create } from 'zustand';
import { normalizeVariants, type Variants } from '@/engine';
import { emptyDraft, type Draft } from './draft';
import { getRepository } from './services';

const DRAFT_KEY = 'setup-draft';

interface DraftStore {
  draft: Draft;
  step: number;
  hydrated: boolean;
  hydrate(defaultVariants: Variants): Promise<void>;
  update(patch: Partial<Draft> | ((d: Draft) => Draft)): void;
  setStep(step: number): void;
  reset(defaultVariants: Variants, draft?: Draft): void;
  clearSaved(): Promise<void>;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

/** Le brouillon est conservé localement pour survivre à une fermeture de l'application. */
function persist(draft: Draft, step: number) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void getRepository()
      .then((r) => r.setSetting(DRAFT_KEY, { draft, step }))
      .catch(() => undefined);
  }, 400);
}

function isDraft(v: unknown): v is { draft: Draft; step: number } {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as { draft?: Partial<Draft>; step?: unknown };
  return typeof o.step === 'number' && typeof o.draft === 'object' && o.draft !== null && Array.isArray(o.draft.players) && typeof o.draft.roleCounts === 'object';
}

export const useDraftStore = create<DraftStore>((set, get) => ({
  draft: emptyDraft(),
  step: 0,
  hydrated: false,

  async hydrate(defaultVariants) {
    if (get().hydrated) return;
    try {
      const repo = await getRepository();
      const saved = await repo.getSetting<unknown>(DRAFT_KEY);
      if (isDraft(saved)) {
        const base = emptyDraft(defaultVariants);
        set({ draft: { ...base, ...saved.draft, variants: normalizeVariants(saved.draft.variants) }, step: Math.max(0, Math.min(4, saved.step)), hydrated: true });
        return;
      }
    } catch {
      // Brouillon illisible : on repart d'un brouillon vierge.
    }
    set({ draft: emptyDraft(defaultVariants), step: 0, hydrated: true });
  },

  update(patch) {
    const draft = typeof patch === 'function' ? patch(get().draft) : { ...get().draft, ...patch };
    set({ draft });
    persist(draft, get().step);
  },

  setStep(step) {
    set({ step });
    persist(get().draft, step);
  },

  reset(defaultVariants, draft) {
    const d = draft ?? emptyDraft(defaultVariants);
    set({ draft: d, step: 0, hydrated: true });
    persist(d, 0);
  },

  async clearSaved() {
    if (persistTimer) clearTimeout(persistTimer);
    const repo = await getRepository();
    await repo.setSetting(DRAFT_KEY, null);
  },
}));
