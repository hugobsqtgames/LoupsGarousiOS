import { router } from 'expo-router';

/**
 * Revient au tableau de bord de la partie en dépilant les écrans
 * intermédiaires (évite d'empiler plusieurs tableaux de bord).
 */
export function toDashboard(id: string): void {
  router.dismissTo({ pathname: '/game/[id]', params: { id } });
}

export function toHome(): void {
  router.dismissTo('/');
}
