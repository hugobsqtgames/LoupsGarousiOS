import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  bigBadWolfBlocked,
  attackedThisNight,
  foxFindsWolf,
  foxGroup,
  isWolfSide,
  nameOf,
  packVictim,
  protectedThisNight,
  type GameState,
  type NightStep,
  type StepPayload,
} from '@/engine';
import { Button } from '@/components/button';
import { PrivateReveal } from '@/components/private-reveal';
import { Segmented, ToggleRow } from '@/components/controls';
import { RoleMedallion } from '@/components/game-ui';
import { Icon } from '@/components/icon';
import { Panel } from '@/components/panel';
import { OptionGrid, playerOptions } from '@/components/player-picker';
import { AppText } from '@/components/text';
import { useRoleRegistry } from '@/hooks/use-roles';
import { useTheme } from '@/theme/theme-context';
import { spacing } from '@/theme/themes';

interface FormProps {
  state: GameState;
  step: NightStep;
  value: StepPayload;
  onChange: (p: StepPayload) => void;
}

function toggle(list: string[], id: string, max: number): string[] {
  if (list.includes(id)) return list.filter((x) => x !== id);
  if (list.length >= max) return [...list.slice(1), id];
  return [...list, id];
}

function NoTarget({ active, onPress, label = 'Aucune cible' }: { active: boolean; onPress: () => void; label?: string }) {
  return <Button label={label} variant={active ? 'primary' : 'quiet'} icon={active ? 'check' : 'x'} size="sm" onPress={onPress} testID="no-target" />;
}

function InfoResult({ tone, title, text, testID }: { tone: 'accent' | 'danger' | 'success'; title: string; text: string; testID?: string }) {
  return (
    <Panel tone={tone === 'danger' ? 'danger' : 'accent'} testID={testID}>
      <AppText variant="overline" tone={tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : 'accent'}>
        {title}
      </AppText>
      <AppText variant="title">{text}</AppText>
    </Panel>
  );
}

/** Formulaire de saisie propre à chaque étape de la nuit. */
export function StepForm({ state, step, value, onChange }: FormProps) {
  const { registry } = useRoleRegistry();
  const { colors } = useTheme();
  const actor = step.actorIds.length === 1 ? state.players.find((p) => p.id === step.actorIds[0]) : undefined;
  const target = value.target ?? null;
  const single = (opts: ReturnType<typeof playerOptions>, noneLabel?: string) => (
    <View style={styles.gap}>
      <OptionGrid options={opts} selected={target ? [target] : []} onSelect={(id) => onChange({ ...value, target: target === id ? null : id })} testID="target-grid" />
      <NoTarget active={value.target === null} onPress={() => onChange({ ...value, target: null })} label={noneLabel} />
    </View>
  );

  switch (step.kind) {
    case 'bluff':
      return (
        <Panel>
          <View style={styles.inline}>
            <Icon name="info" color={colors.info} />
            <AppText variant="small" tone="muted" style={styles.flex}>
              Ce rôle est absent, éliminé ou privé de pouvoir. Appelez-le comme d’habitude, patientez quelques secondes, puis passez à la suite : personne ne doit pouvoir le deviner.
            </AppText>
          </View>
        </Panel>
      );
    case 'judge':
      return (
        <Panel overline="Signe convenu">
          <AppText variant="small" tone="muted">
            Le Juge bègue vous montre le signe qu’il fera pendant un vote pour imposer un second vote (une seule fois dans la partie). Mémorisez-le.
          </AppText>
          <AppText variant="bodyStrong">{step.actorIds.map((id) => nameOf(state, id)).join(' · ')}</AppText>
        </Panel>
      );
    case 'bear-tamer':
      return (
        <Panel overline="Repérage">
          <AppText variant="small" tone="muted">
            Notez qui est le Montreur d’ours : chaque matin, l’application vous dira si son ours grogne.
          </AppText>
          <AppText variant="bodyStrong">{step.actorIds.map((id) => nameOf(state, id)).join(' · ')}</AppText>
        </Panel>
      );
    case 'gypsy':
      return <GypsyForm state={state} step={step} value={value} onChange={onChange} />;
    case 'lovers':
    case 'sisters':
    case 'brothers':
    case 'charmed':
      return (
        <Panel overline="Joueurs concernés">
          <AppText variant="bodyStrong">{step.actorIds.map((id) => nameOf(state, id)).join(' · ') || 'Aucun'}</AppText>
        </Panel>
      );
    case 'thief': {
      const cards = state.setup.extraCards.slice(0, 2);
      const mustTake = cards.every((c) => c === 'loup-garou');
      return (
        <View style={styles.gap}>
          {state.setup.dealMode === 'phone' && actor ? <ThiefPhoneReveal state={state} actorName={actor.name} cards={cards} mustTake={mustTake} onChoose={(cardIndex) => onChange({ cardIndex })} /> : null}
          {cards.map((c, i) => {
            const def = registry.get(c);
            const active = value.cardIndex === i;
            return (
              <Panel key={i} tone={active ? 'accent' : 'default'} onPress={() => onChange({ cardIndex: i })} testID={`thief-take-${i}`} style={styles.cardRow}>
                <RoleMedallion role={def} />
                <View style={styles.flex}>
                  <AppText variant="overline" tone="muted">{`Carte ${i + 1}`}</AppText>
                  <AppText variant="heading">{def.name}</AppText>
                </View>
                {active ? <Icon name="check" color={colors.accent} /> : null}
              </Panel>
            );
          })}
          {mustTake ? (
            <AppText variant="small" tone="warning">
              Les deux cartes sont des Loups-Garous : le Voleur doit en prendre une.
            </AppText>
          ) : (
            <NoTarget active={value.cardIndex === null} onPress={() => onChange({ cardIndex: null })} label="Il garde sa carte" />
          )}
        </View>
      );
    }
    case 'comedian': {
      const cards = state.night?.startComedianCards ?? [];
      return (
        <View style={styles.gap}>
          {cards.map((c, i) => {
            const def = registry.get(c);
            const active = value.cardIndex === i;
            return (
              <Panel key={i} tone={active ? 'accent' : 'default'} onPress={() => onChange({ cardIndex: i })} testID={`comedian-take-${i}`} style={styles.cardRow}>
                <RoleMedallion role={def} />
                <AppText variant="heading" style={styles.flex}>
                  {def.name}
                </AppText>
                {active ? <Icon name="check" color={colors.accent} /> : null}
              </Panel>
            );
          })}
          <NoTarget active={value.cardIndex === null} onPress={() => onChange({ cardIndex: null })} label="Aucune carte cette nuit" />
        </View>
      );
    }
    case 'wolfhound':
      return (
        <View style={styles.row}>
          <Button label="Villageois" icon="villager" variant={value.team === 'village' ? 'primary' : 'secondary'} onPress={() => onChange({ team: 'village' })} style={styles.flex} testID="wolfhound-village" />
          <Button label="Loup-Garou" icon="wolf" variant={value.team === 'wolves' ? 'danger' : 'secondary'} onPress={() => onChange({ team: 'wolves' })} style={styles.flex} testID="wolfhound-wolves" />
        </View>
      );
    case 'cupid':
    case 'piper': {
      const isPiper = step.kind === 'piper';
      const targets = value.targets ?? [];
      const opts = playerOptions(state.players, {
        exclude: (p) => (isPiper ? (p.id === actor?.id ? 'Lui-même' : p.charmed ? 'Déjà charmé' : null) : null),
      });
      const need = isPiper ? Math.min(2, opts.filter((o) => !o.disabled).length) : 2;
      return (
        <View style={styles.gap}>
          <AppText variant="caption" tone="muted">{`${targets.length} / ${need} sélectionné(s)`}</AppText>
          <OptionGrid options={opts} selected={targets} onSelect={(id) => onChange({ targets: toggle(targets, id, 2) })} testID="multi-grid" />
        </View>
      );
    }
    case 'wild-child':
      return single(playerOptions(state.players, { exclude: (p) => (p.id === actor?.id ? 'Lui-même' : null) }), 'Choisir plus tard (non recommandé)');
    case 'salvateur':
      return single(
        playerOptions(state.players, {
          exclude: (p) => (state.setup.variants.salvateurNoRepeat && actor?.lastProtected === p.id ? 'Protégé la nuit dernière' : !state.setup.variants.salvateurSelf && p.id === actor?.id ? 'Lui-même' : null),
        }),
        'Personne',
      );
    case 'seer': {
      const t = target ? state.players.find((p) => p.id === target) : undefined;
      return (
        <View style={styles.gap}>
          {single(playerOptions(state.players, { exclude: (p) => (p.id === actor?.id ? 'Elle-même' : null) }), 'Ne sonde personne')}
          {t ? (
            <Panel tone="accent" testID="seer-result" style={styles.cardRow}>
              <RoleMedallion role={registry.get(t.roleId)} size={52} />
              <View style={styles.flex}>
                <AppText variant="overline" tone="accent">
                  Montrez la carte de {t.name}
                </AppText>
                <AppText variant="title">{registry.get(t.roleId).name}</AppText>
                {t.infected ? (
                  <AppText variant="caption" tone="wolves">
                    Joueur infecté : il appartient désormais aux loups.
                  </AppText>
                ) : null}
              </View>
            </Panel>
          ) : null}
        </View>
      );
    }
    case 'fox': {
      const group = target ? foxGroup(state, target) : [];
      const found = target ? foxFindsWolf(state, target) : false;
      return (
        <View style={styles.gap}>
          {single(playerOptions(state.players), 'Ne flaire pas')}
          {target ? (
            <InfoResult
              tone={found ? 'danger' : 'success'}
              title={`Groupe : ${group.map((id) => nameOf(state, id)).join(', ')}`}
              text={found ? 'OUI — faites un signe positif : un loup s’y cache.' : 'NON — aucun loup : le Renard perd son flair.'}
              testID="fox-result"
            />
          ) : null}
        </View>
      );
    }
    case 'wolves': {
      const girl = state.players.find((p) => p.alive && p.roleId === 'petite-fille' && !isWolfSide(p));
      return (
        <View style={styles.gap}>
          {value.littleGirlCaught ? null : single(playerOptions(state.players, { exclude: (p) => (isWolfSide(p) ? 'Loup' : null) }), 'Pas d’accord : aucune victime')}
          {girl ? (
            <ToggleRow
              label="La Petite Fille a été surprise"
              help={`${girl.name} meurt à la place de la victime désignée.`}
              value={!!value.littleGirlCaught}
              onChange={(v) => onChange({ ...value, littleGirlCaught: v, target: v ? null : value.target })}
              testID="little-girl-caught"
            />
          ) : null}
        </View>
      );
    }
    case 'infect': {
      const victim = packVictim(state, state.night?.choices.wolves);
      const blocked = victim ? protectedThisNight(state, state.night?.choices ?? {}).has(victim) : false;
      if (!victim || blocked) {
        return (
          <Panel>
            <AppText variant="small" tone="muted">
              {blocked ? 'La victime est protégée : l’infection est impossible.' : 'Aucune victime cette nuit : rien à infecter.'} Faites semblant d’attendre la réponse.
            </AppText>
          </Panel>
        );
      }
      return (
        <View style={styles.gap}>
          <AppText variant="bodyStrong">Victime de la meute : {nameOf(state, victim)}</AppText>
          <View style={styles.row}>
            <Button label="La dévorer" variant={value.infect ? 'secondary' : 'primary'} onPress={() => onChange({ infect: false })} style={styles.flex} testID="infect-no" />
            <Button label="L’infecter" icon="fang" variant={value.infect ? 'danger' : 'secondary'} onPress={() => onChange({ infect: true })} style={styles.flex} testID="infect-yes" />
          </View>
        </View>
      );
    }
    case 'white-wolf':
      return single(
        playerOptions(state.players.filter((p) => isWolfSide(p) && p.id !== actor?.id)),
        'Ne dévore personne',
      );
    case 'big-bad-wolf': {
      const pack = packVictim(state, state.night?.choices.wolves);
      return single(playerOptions(state.players, { exclude: (p) => (isWolfSide(p) ? 'Loup' : p.id === pack ? 'Victime de la meute' : null) }), bigBadWolfBlocked(state) ? 'Pouvoir perdu' : 'Pas de seconde victime');
    }
    case 'witch': {
      const attacked = attackedThisNight(state, state.night?.choices ?? {});
      const canHeal = (actor?.uses.heal ?? 0) > 0;
      const canPoison = (actor?.uses.poison ?? 0) > 0;
      return (
        <View style={styles.gap}>
          <Panel tone={attacked.length ? 'danger' : 'default'} overline="À montrer à la Sorcière">
            <AppText variant="title" testID="witch-victims">
              {attacked.length ? attacked.map((id) => nameOf(state, id)).join(' et ') : 'Aucune victime cette nuit'}
            </AppText>
          </Panel>
          <AppText variant="overline" tone="muted">
            {canHeal ? 'Potion de vie' : 'Potion de vie déjà utilisée'}
          </AppText>
          {canHeal && attacked.length > 0 ? (
            <View style={styles.wrap}>
              {attacked.map((id) => {
                const selfBlocked = !state.setup.variants.witchSelfHeal && id === actor?.id;
                const active = value.heal === id;
                return (
                  <Button
                    key={id}
                    label={`Sauver ${nameOf(state, id)}`}
                    icon="potion"
                    disabled={selfBlocked}
                    variant={active ? 'primary' : 'secondary'}
                    onPress={() => onChange({ ...value, heal: active ? null : id, poison: value.poison === id ? null : value.poison })}
                    testID={`witch-heal-${id}`}
                  />
                );
              })}
            </View>
          ) : null}
          <AppText variant="overline" tone="muted">
            {canPoison ? 'Potion de mort' : 'Potion de mort déjà utilisée'}
          </AppText>
          {canPoison ? (
            <>
              <OptionGrid
                options={playerOptions(state.players, { exclude: (p) => (p.id === value.heal ? 'Sauvé(e)' : null) })}
                selected={value.poison ? [value.poison] : []}
                onSelect={(id) => onChange({ ...value, poison: value.poison === id ? null : id })}
                testID="poison-grid"
              />
              <NoTarget active={!value.poison} onPress={() => onChange({ ...value, poison: null })} label="N’empoisonne personne" />
            </>
          ) : null}
        </View>
      );
    }
    case 'raven':
      return single(playerOptions(state.players), 'Personne');
    case 'custom': {
      const def = actor ? registry.getCustom(actor.roleId) : null;
      const t = target ? state.players.find((p) => p.id === target) : undefined;
      return (
        <View style={styles.gap}>
          {single(playerOptions(state.players, { exclude: (p) => (!def?.canTargetSelf && p.id === actor?.id ? 'Lui-même' : null) }), 'Aucune cible')}
          {def?.nightAction === 'inspect' && t ? <InfoResult tone="accent" title={`Rôle de ${t.name}`} text={registry.get(t.roleId).name} testID="custom-result" /> : null}
        </View>
      );
    }
  }
}

/** Gitane : carte Spiritisme (1 à 5), question (1 à 4) et joueur qui la posera au matin. */
function GypsyForm({ state, step, value, onChange }: FormProps) {
  const actor = state.players.find((p) => p.id === step.actorIds[0]);
  const used = actor?.spiritCardsUsed ?? [];
  const declined = value.target === null;
  return (
    <View style={styles.gap}>
      <AppText variant="small" tone="muted">
        Si elle accepte, lisez les quatre questions d’une carte Spiritisme ; elle en désigne une, puis le joueur qui la posera au matin. Le premier éliminé répondra par oui ou non.
      </AppText>
      <AppText variant="overline" tone="muted">
        Carte Spiritisme
      </AppText>
      <View style={styles.wrap}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Button
            key={n}
            label={`N° ${n}`}
            size="sm"
            disabled={used.includes(n) || declined}
            variant={value.cardIndex === n ? 'primary' : 'secondary'}
            onPress={() => onChange({ ...value, cardIndex: n })}
            accessibilityHint={used.includes(n) ? 'Carte déjà utilisée' : undefined}
            testID={`gypsy-card-${n}`}
          />
        ))}
      </View>
      <AppText variant="overline" tone="muted">
        Question choisie
      </AppText>
      <Segmented<number>
        value={value.question ?? 0}
        onChange={(question) => !declined && onChange({ ...value, question })}
        options={[1, 2, 3, 4].map((q) => ({ value: q, label: `Q${q}` }))}
        testID="gypsy-question"
      />
      <AppText variant="overline" tone="muted">
        Joueur qui posera la question (le Spirite)
      </AppText>
      <OptionGrid options={playerOptions(state.players)} selected={value.target ? [value.target] : []} onSelect={(id) => onChange({ ...value, target: value.target === id ? undefined : id })} testID="target-grid" />
      <NoTarget active={declined} onPress={() => onChange({ target: null })} label="Elle n’utilise pas son pouvoir" />
    </View>
  );
}

/** Mode téléphone : le Voleur découvre lui-même les deux cartes du centre et choisit. */
function ThiefPhoneReveal({ state, actorName, cards, mustTake, onChoose }: { state: GameState; actorName: string; cards: GameState['setup']['extraCards']; mustTake: boolean; onChoose: (i: number | null) => void }) {
  const { registry } = useRoleRegistry();
  const [open, setOpen] = useState(false);
  void state;
  return (
    <>
      <Button label="Montrer les cartes du centre au Voleur" icon="phone" variant="secondary" onPress={() => setOpen(true)} testID="thief-phone" />
      <PrivateReveal visible={open} playerName={actorName} instruction="Le Voleur découvre les deux cartes du centre et choisit seul." doneLabel="Cacher sans changer" onDone={() => setOpen(false)} testID="thief-reveal">
        {(hide) => (
          <View style={styles.gap}>
            <AppText variant="title" align="center">
              Les deux cartes du centre
            </AppText>
            {cards.map((c, i) => {
              const def = registry.get(c);
              return (
                <Panel key={i} style={styles.cardRow} onPress={() => { onChoose(i); hide(); }} testID={`thief-phone-take-${i}`}>
                  <RoleMedallion role={def} size={52} />
                  <View style={styles.flex}>
                    <AppText variant="overline" tone="muted">{`Prendre la carte ${i + 1}`}</AppText>
                    <AppText variant="heading">{def.name}</AppText>
                  </View>
                </Panel>
              );
            })}
            {mustTake ? (
              <AppText variant="small" tone="warning" align="center">
                Deux Loups-Garous : tu dois en prendre un.
              </AppText>
            ) : (
              <Button label="Garder ma carte de Voleur" variant="secondary" onPress={() => { onChoose(null); hide(); }} testID="thief-phone-keep" />
            )}
          </View>
        )}
      </PrivateReveal>
    </>
  );
}

/** Valeur initiale d'un formulaire d'étape (aucune cible tant que le MJ n'a pas choisi). */
export function defaultValue(step: NightStep): StepPayload {
  if (step.payload) return step.payload;
  if (step.kind === 'cupid' || step.kind === 'piper') return { targets: [] };
  if (step.kind === 'witch') return { heal: null, poison: null };
  if (step.kind === 'infect') return { infect: false };
  return {};
}

/** Le formulaire est-il suffisamment rempli pour être validé ? */
export function isComplete(step: NightStep, v: StepPayload, state: GameState): boolean {
  switch (step.kind) {
    case 'thief':
    case 'comedian':
      return v.cardIndex !== undefined;
    case 'wolfhound':
      return v.team !== undefined;
    case 'cupid':
      return (v.targets ?? []).length === 2;
    case 'piper': {
      const avail = state.players.filter((p) => p.alive && !p.charmed && p.id !== step.actorIds[0]).length;
      return (v.targets ?? []).length === Math.min(2, avail);
    }
    case 'gypsy':
      return v.target === null || (v.target !== undefined && v.cardIndex !== undefined && v.cardIndex !== null && v.question !== undefined);
    case 'judge':
    case 'bear-tamer':
    case 'witch':
    case 'infect':
    case 'bluff':
    case 'lovers':
    case 'sisters':
    case 'brothers':
    case 'charmed':
      return true;
    case 'wolves':
      return v.target !== undefined || v.littleGirlCaught === true;
    default:
      return v.target !== undefined;
  }
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
