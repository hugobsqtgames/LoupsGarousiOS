import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { createRng, MAX_NAME_LENGTH, MAX_PLAYERS, nameKey, normalizeName, shuffle } from '@/engine';
import { Button, IconButton } from '@/components/button';
import { Segmented, TextField } from '@/components/controls';
import { moveItem, SeatingCircle } from '@/components/seating-circle';
import { useAppStore } from '@/state/app-store';
import { computePlayerStats } from '@/state/stats';
import { useFeedback } from '@/components/feedback';
import { EmptyState } from '@/components/game-ui';
import { Panel } from '@/components/panel';
import { AppText } from '@/components/text';
import { nameIssues } from '@/state/draft';
import { useDraftStore } from '@/state/draft-store';
import { useTheme } from '@/theme/theme-context';
import { spacing } from '@/theme/themes';
import { makeId } from '@/utils/id';

export function StepPlayers() {
  const draft = useDraftStore((s) => s.draft);
  const update = useDraftStore((s) => s.update);
  const { colors } = useTheme();
  const { confirm } = useFeedback();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const duplicates = new Set(nameIssues(draft.players).map(nameKey));
  const [view, setView] = useState<'list' | 'table'>('list');
  const [seatSel, setSeatSel] = useState<string | null>(null);
  const games = useAppStore((s) => s.games);
  const present = new Set(draft.players.map((p) => nameKey(p.name)));
  const regulars = computePlayerStats(games)
    .filter((s) => !present.has(s.key))
    .slice(0, 16);

  const add = (raw = name) => {
    const n = normalizeName(raw);
    if (!n) return setError('Saisissez un nom.');
    if (n.length > MAX_NAME_LENGTH) return setError(`${MAX_NAME_LENGTH} caractères maximum.`);
    if (draft.players.some((p) => nameKey(p.name) === nameKey(n))) return setError(`« ${n} » est déjà dans la liste.`);
    if (draft.players.length >= MAX_PLAYERS) return setError(`${MAX_PLAYERS} joueurs maximum.`);
    update((d) => ({ ...d, players: [...d.players, { id: makeId('pl'), name: n }], assignments: {} }));
    setName('');
    setError(null);
  };

  const rename = (id: string) => {
    const n = normalizeName(editName);
    if (!n || n.length > MAX_NAME_LENGTH) return;
    update((d) => ({ ...d, players: d.players.map((p) => (p.id === id ? { ...p, name: n } : p)) }));
    setEditing(null);
  };

  const move = (index: number, delta: number) => {
    update((d) => {
      const players = [...d.players];
      const j = index + delta;
      if (j < 0 || j >= players.length) return d;
      [players[index], players[j]] = [players[j], players[index]];
      return { ...d, players };
    });
  };

  const remove = async (id: string, label: string) => {
    if (await confirm({ title: 'Retirer ce joueur ?', message: `${label} sera retiré(e) de la liste.`, confirmLabel: 'Retirer', destructive: true })) {
      update((d) => {
        const assignments = { ...d.assignments };
        delete assignments[id];
        return { ...d, players: d.players.filter((p) => p.id !== id), assignments };
      });
    }
  };

  return (
    <View style={styles.gap}>
      <Panel overline="Ajouter un joueur">
        <View style={styles.addRow}>
          <View style={styles.flex}>
            <TextField
              placeholder="Nom ou pseudonyme"
              value={name}
              onChangeText={(t) => {
                setName(t);
                setError(null);
              }}
              onSubmitEditing={() => add()}
              returnKeyType="done"
              blurOnSubmit={false}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={MAX_NAME_LENGTH + 4}
              error={error}
              testID="player-name-input"
            />
          </View>
          <IconButton icon="plus" label="Ajouter le joueur" onPress={() => add()} tone="accent" size={52} testID="add-player" />
        </View>
        <AppText variant="caption" tone="muted">
          L’ordre de la liste suit les places autour de la table, dans le sens des aiguilles d’une montre (utile pour le Renard, l’ours et le Chevalier).
        </AppText>
      </Panel>

      {regulars.length > 0 ? (
        <Panel overline="Joueurs habituels" testID="regulars">
          <AppText variant="caption" tone="muted">
            Reprendre le même nom d’une partie à l’autre permet de suivre les statistiques de chacun.
          </AppText>
          <View style={styles.wrap}>
            {regulars.map((r) => (
              <Button key={r.key} label={r.name} icon="user-plus" size="sm" variant="secondary" onPress={() => add(r.name)} testID={`regular-${r.key}`} />
            ))}
          </View>
        </Panel>
      ) : null}

      {draft.players.length > 2 ? (
        <Segmented<'list' | 'table'>
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: 'Liste' },
            { value: 'table', label: 'Plan de table' },
          ]}
          testID="players-view"
        />
      ) : null}

      {view === 'table' && draft.players.length > 2 ? (
        <Panel overline="Plan de table" testID="draft-table">
          <AppText variant="caption" tone="muted">
            Faites glisser un joueur vers sa place, ou touchez-le puis utilisez les boutons. Place 1 en haut, sens horaire.
          </AppText>
          <SeatingCircle
            seats={draft.players.map((p) => ({ id: p.id, name: p.name }))}
            selectedId={seatSel}
            onSelect={(id) => setSeatSel(seatSel === id ? null : id)}
            onReorder={(from, to) => update((d) => ({ ...d, players: moveItem(d.players, from, to) }))}
          />
        </Panel>
      ) : draft.players.length === 0 ? (
        <EmptyState icon="users" title="Aucun joueur" message="Ajoutez au moins 5 joueurs pour composer le village." />
      ) : (
        <Panel padded={false} overline={undefined}>
          {draft.players.map((p, i) => (
            <View key={p.id} style={[styles.playerRow, { borderBottomColor: colors.border }]} testID={`player-row-${i}`}>
              <AppText variant="caption" tone="faint" style={styles.seat}>
                {i + 1}
              </AppText>
              {editing === p.id ? (
                <View style={styles.flex}>
                  <TextField value={editName} onChangeText={setEditName} onSubmitEditing={() => rename(p.id)} autoFocus maxLength={MAX_NAME_LENGTH} onBlur={() => rename(p.id)} testID="player-edit-input" />
                </View>
              ) : (
                <View style={styles.flex}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {p.name}
                  </AppText>
                  {duplicates.has(nameKey(p.name)) ? (
                    <AppText variant="caption" tone="danger">
                      Nom en double
                    </AppText>
                  ) : null}
                </View>
              )}
              <IconButton icon="arrow-up" label={`Monter ${p.name}`} onPress={() => move(i, -1)} disabled={i === 0} size={38} />
              <IconButton icon="arrow-down" label={`Descendre ${p.name}`} onPress={() => move(i, 1)} disabled={i === draft.players.length - 1} size={38} />
              <IconButton
                icon="edit"
                label={`Renommer ${p.name}`}
                onPress={() => {
                  setEditing(p.id);
                  setEditName(p.name);
                }}
                size={38}
              />
              <IconButton icon="trash" label={`Retirer ${p.name}`} onPress={() => void remove(p.id, p.name)} tone="danger" size={38} testID={`remove-player-${i}`} />
            </View>
          ))}
        </Panel>
      )}
      {draft.players.length > 1 ? (
        <Button
          label="Mélanger l’ordre des places"
          icon="refresh"
          variant="quiet"
          size="sm"
          onPress={() => update((d) => ({ ...d, players: shuffle(d.players, createRng(Date.now())) }))}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  flex: { flex: 1 },
  addRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  seat: { width: 22, textAlign: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
