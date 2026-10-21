import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { balanceOf, COMEDIAN_ALLOWED, EXPANSION_LABELS, TEAM_LABELS, type Complexity, type Expansion, type RoleDefinition, type RoleId } from '@/engine';
import { Button } from '@/components/button';
import { Segmented, Stepper, ToggleRow } from '@/components/controls';
import { RoleMedallion } from '@/components/game-ui';
import { Icon } from '@/components/icon';
import { Chip, Panel, SectionTitle } from '@/components/panel';
import { OptionGrid } from '@/components/player-picker';
import { Sheet } from '@/components/sheet';
import { AppText } from '@/components/text';
import { useRoleRegistry } from '@/hooks/use-roles';
import { applyAutoComposition, cardCount, defaultComedianCards, rolesFromCounts } from '@/state/draft';
import { useDraftStore } from '@/state/draft-store';
import { useAppStore } from '@/state/app-store';
import { useTheme } from '@/theme/theme-context';
import { spacing, teamColor } from '@/theme/themes';

const EXPANSIONS: Expansion[] = ['base', 'nouvelle-lune', 'personnages', 'custom'];
const SHORT_EXPANSION: Record<Expansion, string> = { base: 'Base', 'nouvelle-lune': 'N. Lune', personnages: 'Perso', custom: 'Créés' };

function RoleCountRow({ role, count, onChange, favorite }: { role: RoleDefinition; count: number; onChange: (n: number) => void; favorite: boolean }) {
  const { colors } = useTheme();
  const exact = role.exactCopies;
  return (
    <View style={[styles.roleRow, { borderBottomColor: colors.border }]} testID={`role-row-${role.id}`}>
      <RoleMedallion role={role} size={40} />
      <View style={styles.flex}>
        <View style={styles.inline}>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.shrink}>
            {role.name}
          </AppText>
          {favorite ? <Icon name="favorite" color={colors.accent} size={14} /> : null}
        </View>
        <AppText variant="caption" color={teamColor(colors, role.team)}>
          {TEAM_LABELS[role.team]}
          {exact ? ` · par ${exact}` : ''}
        </AppText>
      </View>
      {exact ? (
        <Button
          label={count > 0 ? `${count} ✓` : 'Ajouter'}
          size="sm"
          variant={count > 0 ? 'primary' : 'quiet'}
          onPress={() => onChange(count > 0 ? 0 : exact)}
          testID={`role-toggle-${role.id}`}
        />
      ) : (
        <Stepper value={count} min={0} max={role.maxCopies} onChange={onChange} label={role.name} testID={`role-count-${role.id}`} />
      )}
    </View>
  );
}

export function StepRoles() {
  const draft = useDraftStore((s) => s.draft);
  const update = useDraftStore((s) => s.update);
  const favorites = useAppStore((s) => s.settings.favoriteRoles);
  const { all, registry } = useRoleRegistry();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<Expansion | 'all'>('all');
  const [cardSheet, setCardSheet] = useState<{ kind: 'thief' | 'comedian'; index: number } | null>(null);

  const roles = rolesFromCounts(draft.roleCounts);
  const cards = cardCount(draft);
  const n = draft.players.length;
  const balance = balanceOf(roles);
  const visible = useMemo(() => all.filter((r) => filter === 'all' || r.expansion === filter), [all, filter]);

  const setCount = (id: RoleId, count: number) => {
    update((d) => {
      const roleCounts = { ...d.roleCounts, [id]: count };
      const next = { ...d, roleCounts, assignments: {} };
      if (id === 'comedien' && count > 0) next.comedianCards = defaultComedianCards(rolesFromCounts(roleCounts));
      return next;
    });
  };

  const balanceLabel = Math.abs(balance) <= Math.max(3, Math.round(n / 3)) ? 'Équilibrée' : balance > 0 ? 'Favorable au village' : 'Favorable aux loups';
  const countOk = cards === n;
  const extraOptions = (kind: 'thief' | 'comedian') =>
    (kind === 'thief' ? all.filter((r) => r.id !== 'voleur' && r.id !== 'comedien') : all.filter((r) => COMEDIAN_ALLOWED.includes(r.id as never))).map((r) => ({ id: r.id, label: r.name, sublabel: TEAM_LABELS[r.team] }));

  return (
    <View style={styles.gap}>
      <Panel tone={countOk ? 'default' : 'warning'} testID="composition-summary">
        <View style={styles.summary}>
          <View>
            <AppText variant="number" tone={countOk ? 'success' : 'warning'} testID="card-count">
              {cards} / {n}
            </AppText>
            <AppText variant="caption" tone="muted">
              cartes / joueurs
            </AppText>
          </View>
          <View style={styles.right}>
            <Chip label={balanceLabel} color={balanceLabel === 'Équilibrée' ? colors.success : colors.warning} />
            <AppText variant="caption" tone="faint">
              Indice heuristique {balance > 0 ? '+' : ''}
              {balance}
            </AppText>
          </View>
        </View>
      </Panel>

      <Panel overline="Composition automatique" title="Laisser le grimoire choisir">
        <Segmented<Complexity>
          value={draft.complexity}
          onChange={(complexity) => update({ complexity })}
          options={[
            { value: 'decouverte', label: 'Découverte' },
            { value: 'equilibre', label: 'Équilibrée' },
            { value: 'riche', label: 'Riche' },
          ]}
          testID="complexity"
        />
        <View style={styles.wrap}>
          {(['base', 'nouvelle-lune', 'personnages'] as Expansion[]).map((e) => {
            const on = draft.expansions.includes(e);
            return (
              <Button
                key={e}
                label={EXPANSION_LABELS[e]}
                size="sm"
                variant={on ? 'primary' : 'quiet'}
                icon={on ? 'check' : undefined}
                onPress={() => update((d) => ({ ...d, expansions: on ? d.expansions.filter((x) => x !== e) : [...d.expansions, e] }))}
                testID={`expansion-${e}`}
              />
            );
          })}
        </View>
        <ToggleRow label="Autoriser un rôle solitaire" help="Joueur de flûte ou Ange (10 joueurs et plus)." value={draft.allowSolo} onChange={(allowSolo) => update({ allowSolo })} />
        <Button
          label={n < 5 ? 'Ajoutez au moins 5 joueurs' : 'Générer une composition'}
          icon="dice"
          disabled={n < 5 || !draft.expansions.includes('base')}
          onPress={() => update((d) => applyAutoComposition({ ...d, seed: (d.seed * 31 + 7) % 1_000_003 }))}
          testID="auto-compose"
        />
        {!draft.expansions.includes('base') ? (
          <AppText variant="caption" tone="warning">
            Le jeu de base est nécessaire à la composition automatique.
          </AppText>
        ) : null}
        {draft.explanations.length > 0 ? (
          <View style={styles.explanations} testID="auto-explanations">
            {draft.explanations.map((e, i) => (
              <View key={i} style={styles.inline}>
                <Icon name="sparkles" color={colors.accent} size={14} />
                <AppText variant="caption" tone="muted" style={styles.flex}>
                  {e}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </Panel>

      {roles.includes('voleur') || roles.includes('comedien') ? (
        <Panel overline="Cartes hors jeu" title="Cartes placées au centre">
          {roles.includes('voleur') ? (
            <View style={styles.gapSm}>
              <AppText variant="small" tone="muted">
                Deux cartes proposées au Voleur la première nuit.
              </AppText>
              <View style={styles.wrap}>
                {draft.thiefCards.map((c, i) => (
                  <Button key={i} label={registry.has(c) ? registry.get(c).name : c} size="sm" variant="secondary" icon="mask" onPress={() => setCardSheet({ kind: 'thief', index: i })} testID={`thief-card-${i}`} />
                ))}
              </View>
            </View>
          ) : null}
          {roles.includes('comedien') ? (
            <View style={styles.gapSm}>
              <AppText variant="small" tone="muted">
                Trois cartes que le Comédien pourra emprunter.
              </AppText>
              <View style={styles.wrap}>
                {draft.comedianCards.slice(0, 3).map((c, i) => (
                  <Button key={i} label={registry.has(c) ? registry.get(c).name : c} size="sm" variant="secondary" icon="theater" onPress={() => setCardSheet({ kind: 'comedian', index: i })} testID={`comedian-card-${i}`} />
                ))}
              </View>
            </View>
          ) : null}
        </Panel>
      ) : null}

      <SectionTitle>Choix manuel des cartes</SectionTitle>
      <Segmented<Expansion | 'all'>
        value={filter}
        onChange={setFilter}
        options={[{ value: 'all', label: 'Tous' }, ...EXPANSIONS.filter((e) => e !== 'custom' || all.some((r) => r.expansion === 'custom')).map((e) => ({ value: e, label: SHORT_EXPANSION[e] }))]}
        testID="role-filter"
      />
      <Panel padded={false}>
        {visible.map((r) => (
          <RoleCountRow key={r.id} role={r} count={draft.roleCounts[r.id] ?? 0} onChange={(c) => setCount(r.id, c)} favorite={favorites.includes(r.id)} />
        ))}
      </Panel>

      <Sheet visible={cardSheet !== null} title={cardSheet?.kind === 'thief' ? 'Carte du Voleur' : 'Carte du Comédien'} onClose={() => setCardSheet(null)}>
        {cardSheet ? (
          <OptionGrid
            options={extraOptions(cardSheet.kind)}
            selected={[cardSheet.kind === 'thief' ? draft.thiefCards[cardSheet.index] : draft.comedianCards[cardSheet.index]]}
            onSelect={(picked) => {
              const id = picked as RoleId;
              update((d) =>
                cardSheet.kind === 'thief'
                  ? { ...d, thiefCards: d.thiefCards.map((c, i) => (i === cardSheet.index ? id : c)) as [RoleId, RoleId] }
                  : { ...d, comedianCards: d.comedianCards.map((c, i) => (i === cardSheet.index ? id : c)) },
              );
              setCardSheet(null);
            }}
            testID="extra-card-picker"
          />
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  gapSm: { gap: spacing.sm },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  explanations: { gap: spacing.xs },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});
