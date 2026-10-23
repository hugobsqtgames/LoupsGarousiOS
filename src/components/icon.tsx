import Svg, { Path } from 'react-native-svg';
import { ROLE_GLYPHS } from '@/art/glyphs';

/**
 * Jeu d'icônes vectorielles dessiné pour l'application (grille 24 × 24,
 * trait de 1,75). Aucune police d'icônes ni ressource distante.
 */
const PATHS = {
  // Interface
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M4.5 12.5l4.5 4.5L19.5 6.5',
  x: 'M6 6l12 12M18 6L6 18',
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  'chevron-down': 'M5 9l7 7 7-7',
  'chevron-up': 'M5 15l7-7 7 7',
  'arrow-up': 'M12 19V5M6 11l6-6 6 6',
  'arrow-down': 'M12 5v14M6 13l6 6 6-6',
  undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11',
  redo: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 000 11H13',
  history: 'M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.8L3 8M3 3v5h5M12 7v5l3.5 2',
  settings: 'M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 01-2 1.1L14.8 21h-4l-.3-2.4a7.6 7.6 0 01-1.9-1.1l-1.9.7-2-3.4 1.6-1.2a7.4 7.4 0 010-2.2L4.7 10.2l2-3.4 1.9.7a7.6 7.6 0 012-1.1L10.8 4h4l.3 2.4a7.6 7.6 0 011.9 1.1l1.9-.7 2 3.4-1.6 1.2a7.4 7.4 0 010 2.1z',
  users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21a7 7 0 0114 0M16 3.2a4 4 0 010 7.6M22 21a7 7 0 00-4.5-6.5',
  'user-plus': 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21a7 7 0 0114 0M19 8v6M16 11h6',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  dice: 'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01',
  crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8zM5 19h14',
  ballot: 'M4 11h16v9H4zM8 11V4h8v7M10 7.5l1.5 1.5L14.5 6',
  skull: 'M12 3a8 8 0 00-8 8c0 2.6 1.3 4.6 3 5.8V20h10v-3.2c1.7-1.2 3-3.2 3-5.8a8 8 0 00-8-8zM9 12.5h.01M15 12.5h.01M10.5 20v-2.5M13.5 20v-2.5',
  sunrise: 'M12 3v4M4.9 8.9l1.4 1.4M19.1 8.9l-1.4 1.4M3 17h18M7 17a5 5 0 0110 0M2 21h20',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8.5 8.5 0 019.5 4 8.5 8.5 0 1020 14.5z',
  play: 'M7 4.5v15l12-7.5-12-7.5z',
  pause: 'M8 5v14M16 5v14',
  volume: 'M4 9v6h4l5 4V5L8 9H4zM16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12',
  'volume-off': 'M4 9v6h4l5 4V5L8 9H4zM17 9.5l5 5M22 9.5l-5 5',
  palette: 'M12 3a9 9 0 000 18c1.4 0 2-1 2-2 0-1.5-1.2-1.7-1.2-3 0-1 .8-1.8 1.8-1.8H17a4 4 0 004-4C21 6.2 17 3 12 3zM7.5 11.5h.01M9.5 7.5h.01M14.5 7.5h.01',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7.5h.01',
  alert: 'M12 3L2 20h20L12 3zM12 10v4.5M12 17.5h.01',
  lock: 'M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 017 0V11',
  save: 'M5 3h11l3 3v15H5V3zM8 3v5h7V3M8 21v-7h8v7',
  download: 'M12 4v11M7 10l5 5 5-5M4 20h16',
  upload: 'M12 20V9M7 14l5-5 5 5M4 4h16',
  refresh: 'M20 11a8 8 0 00-14.3-4.9L3 9M3 4v5h5M4 13a8 8 0 0014.3 4.9L21 15M21 20v-5h-5',
  list: 'M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  search: 'M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM16 16l5 5',
  book: 'M4 4.5A1.5 1.5 0 015.5 3H20v15H5.5A1.5 1.5 0 004 19.5v-15zM4 19.5A1.5 1.5 0 005.5 21H20M8 7h8M8 10.5h6',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  favorite: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9L12 3.5z',
  grip: 'M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01',
  sparkles: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  home: 'M3 11l9-8 9 8M5 9.5V21h5v-6h4v6h5V9.5',
  help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 16.8h.01',
  'eye-off': 'M3 3l18 18M10.6 6.1A9.7 9.7 0 0112 6c5 0 8.5 4 9.5 6a12.7 12.7 0 01-2.9 3.6M6.6 6.6A12.6 12.6 0 002.5 12c1 2 4.5 6 9.5 6a9.3 9.3 0 004.4-1.1M9.9 9.9a3 3 0 004.2 4.2',
  note: 'M5 3h10l4 4v14H5V3zM14 3v5h5M8.5 12.5h7M8.5 16h5',
  vote: 'M7 11l3-7c1.3 0 2 1 2 2v3h5.5a2 2 0 012 2.3l-1.2 6.5a2 2 0 01-2 1.7H7M7 11H4v9.5h3V11z',
  ...ROLE_GLYPHS,
  timer: 'M12 21a8 8 0 100-16 8 8 0 000 16zM12 9v4l2.5 2M10 2h4M19 5l1.5 1.5',
  table: 'M12 20a8 8 0 100-16 8 8 0 000 16zM12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4',
  share: 'M12 15V3M8 7l4-4 4 4M5 12v8h14v-8',
  phone: 'M7 2h10a1 1 0 011 1v18a1 1 0 01-1 1H7a1 1 0 01-1-1V3a1 1 0 011-1zM11 18h2',
  replay: 'M3 12a9 9 0 109-9M3 4v5h5M10 9l5 3-5 3V9z',
  timeline: 'M5 4v16M5 7h.01M5 12h.01M5 17h.01M9 7h10M9 12h8M9 17h11',
  megaphone: 'M3 10v4h3l7 4V6L6 10H3zM16 9a4 4 0 010 6M18.5 6.5a7.5 7.5 0 010 11',
  hand: 'M8 13V5.5a1.5 1.5 0 013 0V11M11 10V4.5a1.5 1.5 0 013 0V11M14 10V6a1.5 1.5 0 013 0v7c0 4-2.5 8-7 8-3 0-4.5-1.5-6-4l-2-3.5a1.5 1.5 0 012.6-1.5L8 14',
  contrast: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 3v18',
} as const;

export type IconName = keyof typeof PATHS;

export const ICON_NAMES = Object.keys(PATHS) as IconName[];

interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
  /** Remplit la forme (pour les états « actifs »). */
  filled?: boolean;
}

export function Icon({ name, size = 22, color, strokeWidth = 1.75, filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path
        d={PATHS[name]}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
        fillOpacity={filled ? 0.22 : 0}
      />
    </Svg>
  );
}
