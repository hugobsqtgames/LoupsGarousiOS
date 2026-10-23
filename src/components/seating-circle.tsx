import { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '@/theme/theme-context';
import { radius, spacing } from '@/theme/themes';
import { Button } from './button';
import { AppText } from './text';

export interface Seat {
  id: string;
  name: string;
  sub?: string;
  alive?: boolean;
  /** Mise en évidence : voisin, cible… */
  tone?: 'accent' | 'warning' | 'danger' | null;
}

const TOKEN = 68;

/** Position (centre) de la place `i` sur `n`, la place 1 en haut, sens horaire. */
function seatPos(i: number, n: number, size: number) {
  const r = size / 2 - TOKEN / 2 - 4;
  const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
  return { x: size / 2 + r * Math.cos(a), y: size / 2 + r * Math.sin(a) };
}

function nearestSeat(x: number, y: number, n: number, size: number): number {
  const a = Math.atan2(y - size / 2, x - size / 2) + Math.PI / 2;
  const norm = (a + 2 * Math.PI) % (2 * Math.PI);
  return Math.round((norm / (2 * Math.PI)) * n) % n;
}

function DraggableToken({ seat, index, n, size, selected, draggable, onSelect, onDrop }: { seat: Seat; index: number; n: number; size: number; selected: boolean; draggable: boolean; onSelect: () => void; onDrop: (to: number) => void }) {
  const { colors } = useTheme();
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const pos = seatPos(index, n, size);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => draggable && (Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6),
        onPanResponderMove: (_e, g) => {
          if (draggable) setDrag({ dx: g.dx, dy: g.dy });
        },
        onPanResponderRelease: (_e, g) => {
          setDrag(null);
          const p = seatPos(index, n, size);
          if (draggable && (Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6)) onDrop(nearestSeat(p.x + g.dx, p.y + g.dy, n, size));
          else onSelect();
        },
        onPanResponderTerminate: () => setDrag(null),
      }),
    [draggable, index, n, size, onDrop, onSelect],
  );
  const border = seat.tone === 'danger' ? colors.danger : seat.tone === 'warning' ? colors.warning : seat.tone === 'accent' || selected ? colors.accent : colors.borderStrong;
  return (
    <View
      {...responder.panHandlers}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Place ${index + 1} : ${seat.name}${seat.alive === false ? ', éliminé' : ''}${seat.sub ? `, ${seat.sub}` : ''}`}
      accessibilityState={{ selected }}
      onAccessibilityTap={onSelect}
      style={[
        styles.token,
        {
          left: pos.x - TOKEN / 2 + (drag?.dx ?? 0),
          top: pos.y - TOKEN / 2 + (drag?.dy ?? 0),
          borderColor: border,
          backgroundColor: selected ? colors.accent : colors.surfaceRaised,
          opacity: seat.alive === false ? 0.45 : 1,
          zIndex: drag ? 10 : 1,
          borderWidth: seat.tone || selected ? 3 : 1.5,
        },
      ]}
      testID={`seat-${seat.id}`}
    >
      <AppText variant="caption" tone={selected ? 'onAccent' : 'faint'}>
        {index + 1}
      </AppText>
      <AppText variant="small" tone={selected ? 'onAccent' : 'default'} numberOfLines={1} style={styles.name}>
        {seat.name}
      </AppText>
      {seat.sub ? (
        <AppText variant="caption" tone={selected ? 'onAccent' : 'muted'} numberOfLines={1} style={styles.name}>
          {seat.sub}
        </AppText>
      ) : null}
    </View>
  );
}

/**
 * Plan de table circulaire (place 1 en haut, sens horaire : la place suivante
 * est le voisin de gauche). Avec `onReorder`, les joueurs se déplacent par
 * glisser-déposer, ou avec les boutons d'accessibilité.
 */
export function SeatingCircle({ seats, selectedId, onSelect, onReorder, links = [], testID }: { seats: Seat[]; selectedId: string | null; onSelect: (id: string) => void; onReorder?: (from: number, to: number) => void; links?: [string, string][]; testID?: string }) {
  const { colors } = useTheme();
  const [size, setSize] = useState(320);
  const n = seats.length;
  const onLayout = (e: LayoutChangeEvent) => setSize(Math.min(560, Math.max(260, e.nativeEvent.layout.width)));
  const selectedIndex = seats.findIndex((s) => s.id === selectedId);
  const indexOf = (id: string) => seats.findIndex((s) => s.id === id);
  return (
    <View style={styles.root} testID={testID}>
      <View onLayout={onLayout} style={styles.measure} />
      <View style={{ width: size, height: size, alignSelf: 'center' }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle cx={size / 2} cy={size / 2} r={size / 2 - TOKEN / 2 - 4} stroke={colors.border} strokeWidth={1.5} fill="none" strokeDasharray="4 6" />
          <Circle cx={size / 2} cy={size / 2} r={Math.max(20, size / 2 - TOKEN - 16)} fill={colors.surface} opacity={0.6} />
          {links.map(([a, b]) => {
            const ia = indexOf(a);
            const ib = indexOf(b);
            if (ia < 0 || ib < 0) return null;
            const pa = seatPos(ia, n, size);
            const pb = seatPos(ib, n, size);
            return <Line key={`${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={colors.accent} strokeWidth={2} strokeDasharray="6 4" />;
          })}
        </Svg>
        <View style={[styles.center, { top: size / 2 - 24, width: size }]} pointerEvents="none">
          <AppText variant="caption" tone="faint" align="center">
            {n} places
          </AppText>
          <AppText variant="caption" tone="faint" align="center">
            sens horaire ↻
          </AppText>
        </View>
        {seats.map((s, i) => (
          <DraggableToken
            key={s.id}
            seat={s}
            index={i}
            n={n}
            size={size}
            selected={s.id === selectedId}
            draggable={Boolean(onReorder)}
            onSelect={() => onSelect(s.id)}
            onDrop={(to) => onReorder?.(i, to)}
          />
        ))}
      </View>
      {onReorder && selectedIndex >= 0 ? (
        <View style={styles.moves}>
          <Button label="Place précédente" icon="chevron-left" size="sm" variant="secondary" onPress={() => onReorder(selectedIndex, (selectedIndex - 1 + n) % n)} style={styles.flex} testID="seat-move-prev" />
          <Button label="Place suivante" iconRight="chevron-right" size="sm" variant="secondary" onPress={() => onReorder(selectedIndex, (selectedIndex + 1) % n)} style={styles.flex} testID="seat-move-next" />
        </View>
      ) : null}
    </View>
  );
}

/** Déplace l'élément `from` à la position `to` (les autres glissent). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const out = [...list];
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
}

const styles = StyleSheet.create({
  root: { gap: spacing.md, width: '100%' },
  measure: { width: '100%', height: 0 },
  token: { position: 'absolute', width: TOKEN, height: TOKEN, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  name: { maxWidth: TOKEN - 8, textAlign: 'center' },
  center: { position: 'absolute', left: 0 },
  moves: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
