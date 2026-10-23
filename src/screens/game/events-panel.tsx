import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  activeEvents,
  canDrawEvent,
  describeEntry,
  EVENT_MOON_LABELS,
  EVENT_TOOL_LABELS,
  eventDeck,
  eventDrawDue,
  lastWolfVictim,
  nameOf,
  type EventTool,
  type GameState,
  type GrantableUse,
} from '@/engine';
import { Button } from '@/components/button';
import { Segmented } from '@/components/controls';
import { useFeedback } from '@/components/feedback';
import { Chip, Panel } from '@/components/panel';
import { OptionGrid, playerOptions } from '@/components/player-picker';
import { Sheet } from '@/components/sheet';
import { AppText } from '@/components/text';
import { useGameAction } from '@/hooks/use-game';
import { spacing } from '@/theme/themes';

export type MjTool = Exclude<EventTool, 'coin' | 'spare'>;

const TOOL_HELP: Record<MjTool, string> = {
  eliminate: 'Élimine un joueur hors vote (conséquences appliquées : Amoureux, Chasseur, maire…).',
  revive: 'Ramène en jeu un joueur éliminé (Miracle, Spectre…).',
  'set-team': 'Fait passer un joueur dans le camp des loups ou du village.',
  'grant-use': 'Rend une potion à la Sorcière ou son tir au Chasseur.',
  'extra-vote': 'Autorise un vote d’élimination supplémentaire aujourd’hui.',
  'remove-mayor': 'Destitue le maire actuel (une nouvelle élection devient possible).',
};

/** Outils manuels du MJ : appliquer un effet que le moteur ne gère pas seul (événements, règles maison). */
export function MjToolsSheet({ state, visible, tool, onClose }: { state: GameState; visible: boolean; tool: MjTool | null; onClose: () => void }) {
  const act = useGameAction();
  const { confirm } = useFeedback();
  const [current, setCurrent] = useState<MjTool>(tool ?? 'eliminate');
  const [target, setTarget] = useState<string | null>(null);
  const [asVillager, setAsVillager] = useState(true);
  const [team, setTeam] = useState<'village' | 'wolves'>('wolves');
  const [use, setUse] = useState<GrantableUse>('heal');
  const active = tool ?? current;
  const close = () => {
    setTarget(null);
    onClose();
  };
  const suggested = active === 'revive' ? lastWolfVictim(state) : null;
  const options =
    active === 'revive'
      ? playerOptions(state.players.filter((p) => !p.alive), { includeDead: true, sublabel: (p) => (p.id === suggested ? 'Dernière victime des loups' : undefined) })
      : active === 'grant-use'
        ? playerOptions(state.players.filter((p) => p.roleId === 'sorciere' || p.roleId === 'chasseur'))
        : playerOptions(state.players);
  const needsTarget = active !== 'extra-vote' && active !== 'remove-mayor';
  const apply = async () => {
    const name = nameOf(state, target);
    switch (active) {
      case 'eliminate':
        if (target && (await confirm({ title: `Éliminer ${name} ?`, message: 'Les conséquences de sa mort seront appliquées.', confirmLabel: 'Éliminer', destructive: true }))) {
          if (act({ type: 'mj/eliminate', playerId: target }, { sound: 'alert' })) close();
        }
        return;
      case 'revive':
        if (target && act({ type: 'mj/revive', playerId: target, asVillager }, { sound: 'confirm', success: `${name} revient en jeu` })) close();
        return;
      case 'set-team':
        if (target && act({ type: 'mj/set-team', playerId: target, team }, { sound: 'confirm', success: 'Camp modifié' })) close();
        return;
      case 'grant-use':
        if (target && act({ type: 'mj/grant-use', playerId: target, key: use }, { sound: 'confirm', success: 'Pouvoir rendu' })) close();
        return;
      case 'extra-vote':
        if (act({ type: 'mj/extra-vote' }, { sound: 'confirm', success: 'Vote supplémentaire autorisé' })) close();
        return;
      case 'remove-mayor':
        if (await confirm({ title: 'Destituer le maire ?', message: `${nameOf(state, state.mayorId)} perd son titre.`, confirmLabel: 'Destituer' })) {
          if (act({ type: 'mj/remove-mayor' }, { success: 'Maire destitué' })) close();
        }
        return;
    }
  };

  return (
    <Sheet
      visible={visible}
      title={EVENT_TOOL_LABELS[active]}
      subtitle={TOOL_HELP[active]}
      onClose={close}
      footer={<Button label="Appliquer" icon="check" disabled={needsTarget && !target} onPress={apply} testID="mj-tool-apply" />}
      testID="mj-tools"
    >
      {tool === null ? (
        <OptionGrid
          options={(Object.keys(TOOL_HELP) as MjTool[]).map((t) => ({ id: t, label: EVENT_TOOL_LABELS[t] }))}
          selected={[current]}
          onSelect={(id) => {
            setCurrent(id as MjTool);
            setTarget(null);
          }}
          testID="mj-tool-pick"
        />
      ) : null}
      {active === 'revive' ? (
        <Segmented<'v' | 'r'> value={asVillager ? 'v' : 'r'} onChange={(v) => setAsVillager(v === 'v')} options={[{ value: 'v', label: 'En Simple Villageois' }, { value: 'r', label: 'Avec son rôle' }]} />
      ) : null}
      {active === 'set-team' ? (
        <Segmented<'village' | 'wolves'> value={team} onChange={setTeam} options={[{ value: 'wolves', label: 'Camp des loups' }, { value: 'village', label: 'Camp du village' }]} />
      ) : null}
      {active === 'grant-use' ? (
        <Segmented<GrantableUse> value={use} onChange={setUse} options={[{ value: 'heal', label: 'Potion de vie' }, { value: 'poison', label: 'Potion de mort' }, { value: 'shot', label: 'Tir' }]} />
      ) : null}
      {needsTarget ? (
        options.length ? (
          <OptionGrid options={options} selected={target ? [target] : []} onSelect={(id) => setTarget(target === id ? null : id)} testID="mj-tool-target" />
        ) : (
          <AppText variant="small" tone="muted">
            Aucun joueur concerné.
          </AppText>
        )
      ) : null}
    </Sheet>
  );
}

/** Variante Nouvelle Lune : tirage du matin et rappel des événements actifs. */
export function EventsPanel({ state, onTool }: { state: GameState; onTool: (t: MjTool) => void }) {
  const act = useGameAction();
  const [picking, setPicking] = useState(false);
  if (!state.setup.variants.newMoonEvents || state.phase.kind === 'ended') return null;
  const deck = eventDeck(state);
  const due = eventDrawDue(state);
  const anyCard = deck[0]?.id;
  const canDraw = anyCard ? canDrawEvent(state, anyCard) === null : false;
  const active = activeEvents(state);
  const draw = (cardId: string) => {
    if (act({ type: 'event/draw', cardId }, { sound: 'alert' })) setPicking(false);
  };

  return (
    <Panel overline="Événements · Nouvelle Lune" tone={due ? 'accent' : 'default'} testID="events-panel">
      {due ? (
        <AppText variant="bodyStrong">Tirage prévu ce matin : le dernier joueur éliminé lit la carte du dessus.</AppText>
      ) : canDraw ? (
        <AppText variant="small" tone="muted">
          Pas de tirage prévu ce matin (fréquence : un matin sur {state.setup.variants.eventFrequency}). Vous pouvez tirer quand même.
        </AppText>
      ) : null}
      {canDraw ? (
        <View style={styles.row}>
          <Button label="Tirer au hasard" icon="dice" size="sm" onPress={() => draw(deck[Math.floor(Math.random() * deck.length)].id)} style={styles.flex} testID="event-random" />
          <Button label="Carte tirée…" icon="list" size="sm" variant="secondary" onPress={() => setPicking(true)} style={styles.flex} testID="event-pick" />
        </View>
      ) : null}
      {active.length === 0 && !canDraw ? (
        <AppText variant="small" tone="muted">
          Aucun événement actif. {deck.length} carte(s) dans la pioche.
        </AppText>
      ) : null}
      {active.map(({ card, drawn }) => {
        const spirit = card.automation.includes('spiritualism') ? state.log.find((e) => e.event.type === 'spiritualism' && e.event.source === 'event' && e.actionIndex === drawn.actionIndex + 1) : undefined;
        return (
          <View key={card.id} style={styles.card} testID={`event-${card.id}`}>
            <View style={styles.row}>
              <AppText variant="heading" style={styles.flex}>
                {card.name}
              </AppText>
              <Chip label={`Jour ${drawn.day}`} />
            </View>
            <AppText variant="caption" tone="faint">
              {EVENT_MOON_LABELS[card.moon]}
              {card.nameStatus === 'traduit' ? ' · nom traduit par l’application' : ''}
            </AppText>
            <AppText variant="small">{card.summary}</AppText>
            <AppText variant="small" tone="accent">
              {card.howTo}
            </AppText>
            {spirit ? <AppText variant="small">{describeEntry(state, spirit)}</AppText> : null}
            {card.uncertainty ? (
              <AppText variant="caption" tone="warning">
                Interprétation : {card.uncertainty}
              </AppText>
            ) : null}
            {card.tools.filter((t): t is MjTool => t !== 'coin' && t !== 'spare').length ? (
              <View style={styles.wrap}>
                {card.tools
                  .filter((t): t is MjTool => t !== 'coin' && t !== 'spare')
                  .map((t) => (
                    <Button key={t} label={EVENT_TOOL_LABELS[t]} size="sm" variant="secondary" onPress={() => onTool(t)} testID={`event-tool-${t}`} />
                  ))}
              </View>
            ) : null}
          </View>
        );
      })}
      <Sheet visible={picking} title="Carte tirée" subtitle={`${deck.length} carte(s) restante(s)`} onClose={() => setPicking(false)}>
        <OptionGrid options={deck.map((c) => ({ id: c.id, label: c.name, sublabel: EVENT_MOON_LABELS[c.moon] }))} selected={[]} onSelect={draw} testID="event-deck" />
      </Sheet>
    </Panel>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { gap: 4, paddingTop: spacing.sm },
});
