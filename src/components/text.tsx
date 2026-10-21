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
  return <Text maxFontSizeMultiplier={1.6} {...rest} style={[typography[variant], { color: color ?? toneColor[tone], textAlign: align }, style]} />;
}
