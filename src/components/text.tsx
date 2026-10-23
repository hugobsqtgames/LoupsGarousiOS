import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/theme/theme-context';
import { typography, type TypographyVariant } from '@/theme/themes';

export type TextTone = 'default' | 'muted' | 'faint' | 'accent' | 'danger' | 'success' | 'warning' | 'village' | 'wolves' | 'solo' | 'onAccent';

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  align?: TextStyle['textAlign'];
  color?: string;
}

/**
 * Agrandissement maximal par variante (Dynamic Type / Taille du texte) : le
 * texte courant suit les tailles d'accessibilité, les grands titres sont
 * bornés pour rester dans l'écran.
 */
const MAX_SCALE: Record<TypographyVariant, number> = {
  display: 1.3,
  title: 1.5,
  number: 1.4,
  heading: 2,
  body: 2.2,
  bodyStrong: 2.2,
  small: 2.2,
  caption: 2.2,
  overline: 2,
};

export function AppText({ variant = 'body', tone = 'default', align, color, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const toneColor: Record<TextTone, string> = {
    default: colors.text,
    muted: colors.textMuted,
    faint: colors.textFaint,
    accent: colors.accent,
    danger: colors.danger,
    success: colors.success,
    warning: colors.warning,
    village: colors.village,
    wolves: colors.wolves,
    solo: colors.solo,
    onAccent: colors.onAccent,
  };
  return <Text maxFontSizeMultiplier={MAX_SCALE[variant]} {...rest} style={[typography[variant], { color: color ?? toneColor[tone], textAlign: align }, style]} />;
}
