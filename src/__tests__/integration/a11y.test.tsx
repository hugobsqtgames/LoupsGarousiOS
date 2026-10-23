import { act, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';
import { GameDriver, makeSetup } from '@/engine/testing';
import { getRepository } from '@/state/services';
import { renderApp, resetApp, tap } from './setup';

jest.spyOn(process, 'emitWarning').mockImplementation(() => undefined);
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));
jest.mock('@/audio/expo-backend', () => ({ expoAudioBackend: jest.requireActual('./mocks').fakeAudioBackend }));

const INTERACTIVE = new Set(['button', 'checkbox', 'radio', 'adjustable', 'link', 'switch', 'tab', 'menuitem']);

interface JsonNode {
  type: string;
  props: Record<string, unknown>;
  children: (JsonNode | string)[] | null;
}

function textOf(node: JsonNode | string): string {
  if (typeof node === 'string') return node;
  if (node.props?.accessibilityElementsHidden) return '';
  return (node.children ?? []).map(textOf).join(' ');
}

function isHidden(props: Record<string, unknown>): boolean {
  return Boolean(props.accessibilityElementsHidden || props.importantForAccessibility === 'no-hide-descendants' || props['aria-hidden'] === true);
}

/**
 * Audit VoiceOver : chaque élément interactif visible a un rôle et un nom
 * prononçable (libellé explicite ou texte), et aucun bouton n'est muet.
 */
const checked: Record<string, number> = {};

function audit(where: string): string[] {
  const problems: string[] = [];
  checked[where] = 0;
  const visit = (node: JsonNode | string, hidden: boolean) => {
    if (typeof node === 'string') return;
    const h = hidden || isHidden(node.props ?? {});
    const props = node.props ?? {};
    const role = (props.accessibilityRole ?? props.role) as string | undefined;
    const pressable = typeof props.onClick === 'function' || typeof props.onResponderRelease === 'function';
    if (!h && (role ? INTERACTIVE.has(role) : pressable)) {
      checked[where] += 1;
      const label = String(props.accessibilityLabel ?? props['aria-label'] ?? '').trim();
      const name = label || textOf(node).replace(/\s+/g, ' ').trim();
      const id = (props.testID as string) ?? '(sans testID)';
      if (pressable && !role) problems.push(`${where} : élément pressable sans rôle (${id})`);
      if (!name) problems.push(`${where} : ${role ?? 'élément'} sans nom (${id})`);
    }
    for (const c of node.children ?? []) visit(c, h);
  };
  const json = screen.toJSON() as JsonNode | JsonNode[] | null;
  for (const n of Array.isArray(json) ? json : json ? [json] : []) visit(n, false);
  return problems;
}

async function seedGame(): Promise<string> {
  const setup = {
    ...makeSetup(['loup-garou', 'loup-garou', 'voyante', 'sorciere', 'gitane', 'chasseur', 'cupidon', 'villageois', 'villageois'], { names: ['Ana', 'Ben', 'Cléa', 'Dan', 'Eli', 'Flo', 'Gus', 'Hugo', 'Iris'], variants: { newMoonEvents: true } }),
    id: 'g-a11y',
    name: 'Audit',
  };
  const g = new GameDriver(setup);
  const repo = await getRepository();
  await repo.saveGame(g.record, g.state);
  return setup.id;
}

beforeEach(async () => {
  await resetApp();
});

describe('accessibilité (audit VoiceOver automatisé)', () => {
  it('tous les contrôles des écrans principaux ont un rôle et un nom', async () => {
    const id = await seedGame();
    await renderApp(`/game/${id}`);
    await screen.findByTestId('phase-card');
    const problems = audit('tableau de bord');
    await tap('open-night');
    await screen.findByTestId('step-card');
    problems.push(...audit('nuit (Cupidon)'));
    for (const path of ['/settings', '/stats', '/roles', '/new'] as const) {
      await act(async () => router.push(path));
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
      problems.push(...audit(path));
    }
    expect(problems).toEqual([]);
    // L'audit porte réellement sur des contrôles (et non sur un écran vide).
    for (const [where, n] of Object.entries(checked)) expect([where, n >= 5]).toEqual([where, true]);
  });
});
