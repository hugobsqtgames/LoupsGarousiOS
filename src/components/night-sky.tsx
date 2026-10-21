import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/theme/theme-context';

export type SkyMood = 'night' | 'dawn' | 'day';

/** Étoiles à positions fixes (rendu stable, pas d'aléa à chaque rendu). */
const STARS: [number, number, number][] = [
  [22, 18, 1.1], [58, 42, 0.8], [96, 22, 1.3], [131, 58, 0.7], [167, 14, 1], [203, 46, 0.9], [244, 28, 1.2],
  [282, 64, 0.7], [318, 20, 1], [352, 50, 0.8], [40, 78, 0.6], [150, 92, 0.7], [262, 96, 0.6], [372, 88, 0.9],
  [12, 120, 0.6], [110, 130, 0.5], [214, 118, 0.7], [336, 126, 0.6], [74, 150, 0.5], [298, 150, 0.5],
];

/** Silhouette de forêt et de village (largeur de référence 400). */
const FOREST =
  'M0 210 L0 168 L10 172 L18 150 L26 172 L34 160 L44 132 L54 162 L62 152 L72 120 L84 158 L92 146 L100 164 L112 140 L120 160 ' +
  'L132 166 L140 158 L148 166 L156 150 L162 150 L162 140 L170 132 L178 140 L178 150 L186 150 L192 160 L204 138 L214 162 L224 152 ' +
  'L232 128 L242 160 L252 150 L262 112 L274 156 L284 146 L292 162 L302 136 L312 164 L322 156 L330 166 L338 150 L346 158 L356 124 ' +
  'L366 160 L376 148 L386 162 L394 144 L400 156 L400 210 Z';
const VILLAGE = 'M150 210 L150 168 L162 156 L174 168 L174 210 Z M180 210 L180 174 L196 160 L212 174 L212 210 Z M196 150 L196 160';

function NightSkyImpl({ mood = 'night' }: { mood?: SkyMood }) {
  const { colors, discreet, dark } = useTheme();
  const showStars = dark && mood !== 'day' && !discreet;
  const moonY = mood === 'dawn' ? 128 : 92;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 400 210" preserveAspectRatio="xMidYMax slice">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.background} />
            <Stop offset="0.55" stopColor={colors.sky} />
            <Stop offset="1" stopColor={mood === 'dawn' ? colors.warning : colors.horizon} stopOpacity={mood === 'dawn' ? 0.35 : 1} />
          </LinearGradient>
          <RadialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={colors.moon} stopOpacity={discreet ? 0 : 0.45} />
            <Stop offset="1" stopColor={colors.moon} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={colors.warning} stopOpacity={discreet ? 0 : 0.4} />
            <Stop offset="1" stopColor={colors.warning} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="400" height="210" fill="url(#sky)" />
        {showStars ? STARS.map(([x, y, r], i) => <Circle key={i} cx={x} cy={y} r={r} fill={colors.moon} opacity={0.18 + (i % 4) * 0.08} />) : null}
        {mood !== 'day' ? (
          <>
            <Circle cx={330} cy={moonY} r={44} fill="url(#halo)" />
            <Circle cx={330} cy={moonY} r={16} fill={colors.moon} opacity={discreet ? 0.35 : 0.92} />
          </>
        ) : (
          <>
            <Circle cx={330} cy={84} r={44} fill="url(#sun)" />
            <Circle cx={330} cy={84} r={15} fill={colors.warning} opacity={discreet ? 0.3 : 0.75} />
          </>
        )}
        <Ellipse cx={120} cy={168} rx={170} ry={14} fill={colors.mist} />
        <Ellipse cx={320} cy={176} rx={150} ry={12} fill={colors.mist} />
        <Path d={FOREST} fill={colors.silhouette} />
        <Path d={VILLAGE} fill={colors.silhouette} stroke={colors.silhouette} strokeWidth={2} />
        {mood === 'night' && !discreet ? (
          <>
            <Rect x={164} y={180} width={4} height={5} fill={colors.accent} opacity={0.75} />
            <Rect x={194} y={184} width={4} height={5} fill={colors.accent} opacity={0.6} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

export const NightSky = memo(NightSkyImpl);
