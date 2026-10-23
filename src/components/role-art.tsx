import { useMemo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { roleArtSvg, type ArtTeam } from '@/art/role-art';

/** Illustration d'un rôle (carte 3:4), purement décorative pour les lecteurs d'écran. */
export function RoleArt({ roleId, team, width = 180, title }: { roleId: string; team: ArtTeam; width?: number; title?: string | null }) {
  const xml = useMemo(() => roleArtSvg(roleId, { team, title: title ?? null }), [roleId, team, title]);
  return (
    <View style={{ width, height: (width * 4) / 3 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={xml} width={width} height={(width * 4) / 3} />
    </View>
  );
}
