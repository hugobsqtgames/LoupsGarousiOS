import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BUILTIN_ROLES,
  CUSTOM_ACTION_LABELS,
  CUSTOM_ACTIONS,
  CUSTOM_ON_DEATH,
  CUSTOM_ON_DEATH_LABELS,
  CUSTOM_SCHEDULE_LABELS,
  CUSTOM_SCHEDULES,
  NIGHT_ORDER,
  slugify,
  validateCustomRole,
  type CustomRoleDef,
  type Team,
} from '@/engine';
import { Button } from '@/components/button';
import { Segmented, Stepper, TextField, ToggleRow } from '@/components/controls';
import { useFeedback } from '@/components/feedback';
import { Panel } from '@/components/panel';
import { OptionGrid } from '@/components/player-picker';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useAppStore } from '@/state/app-store';
import { spacing } from '@/theme/themes';

/** Repères de l'ordre de nuit pour situer un rôle personnalisé. */
const ORDER_HINTS = Object.entries(NIGHT_ORDER)
  .filter(([k]) => ['thief', 'cupid', 'salvateur', 'seer', 'wolves', 'witch', 'raven'].includes(k))
  .map(([k, v]) => `${v} : ${{ thief: 'Voleur', cupid: 'Cupidon', salvateur: 'Salvateur', seer: 'Voyante', wolves: 'Loups', witch: 'Sorcière', raven: 'Corbeau' }[k]}`)
  .join(' · ');

export function CustomRoleEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const customRoles = useAppStore((s) => s.customRoles);
  const saveCustomRole = useAppStore((s) => s.saveCustomRole);
  const { toast, alert } = useFeedback();
  const existing = id ? customRoles.find((r) => r.id === id) : undefined;
  const [role, setRole] = useState<Omit<CustomRoleDef, 'id'>>(
    existing ?? { name: '', team: 'village', description: '', nightAction: 'inspect', schedule: 'every_night', uses: null, canTargetSelf: false, onDeath: 'none', wakeOrder: 56 },
  );
  const [limited, setLimited] = useState(existing ? existing.uses !== null : false);
  const set = (patch: Partial<typeof role>) => setRole((r) => ({ ...r, ...patch }));

  const save = async () => {
    const slug = slugify(role.name) || 'role';
    const newId = existing?.id ?? (`custom:${slug}` as const);
    if (!existing && (customRoles.some((r) => r.id === newId) || BUILTIN_ROLES.has(slug as never))) {
      await alert('Nom déjà utilisé', 'Un rôle porte déjà ce nom. Choisissez-en un autre.');
      return;
    }
    const candidate = { ...role, id: newId, uses: limited ? (role.uses ?? 1) : null };
    const res = validateCustomRole(candidate);
    if (!res.ok) {
      await alert('Rôle invalide', res.issues.map((i) => i.message).join('\n'));
      return;
    }
    try {
      await saveCustomRole(res.role);
      toast('Rôle enregistré');
      router.back();
    } catch (e) {
      toast(`Échec de l’enregistrement : ${(e as Error).message}`, 'error');
    }
  };

  return (
    <Screen
      overline="Rôle personnalisé"
      title={existing ? existing.name : 'Nouveau rôle'}
      subtitle="Défini par des choix encadrés : aucun code n’est exécuté."
      back
      footer={<Button label="Enregistrer le rôle" icon="save" onPress={save} disabled={role.name.trim().length < 2} testID="save-role" />}
    >
      <Panel>
        <TextField label="Nom" value={role.name} onChangeText={(name) => set({ name })} maxLength={32} placeholder="Ex. : Garde du corps" testID="role-name" />
        <TextField label="Description" value={role.description} onChangeText={(description) => set({ description })} maxLength={500} multiline placeholder="Pouvoir, conditions…" style={styles.multi} testID="role-description" />
      </Panel>
      <Panel overline="Camp">
        <Segmented<Team>
          value={role.team}
          onChange={(team) => set({ team })}
          options={[
            { value: 'village', label: 'Village' },
            { value: 'wolves', label: 'Loups' },
            { value: 'solo', label: 'Solitaire' },
          ]}
          testID="role-team"
        />
        {role.team === 'solo' ? (
          <AppText variant="caption" tone="warning">
            Un solitaire personnalisé n’a pas de condition de victoire propre : il empêche la victoire des camps tant qu’il est vivant.
          </AppText>
        ) : null}
      </Panel>
      <Panel overline="Action nocturne">
        <OptionGrid options={CUSTOM_ACTIONS.map((a) => ({ id: a, label: CUSTOM_ACTION_LABELS[a] }))} selected={[role.nightAction]} onSelect={(a) => set({ nightAction: a as CustomRoleDef['nightAction'] })} columns={2} testID="role-action" />
        {role.nightAction !== 'none' ? (
          <>
            <AppText variant="overline" tone="muted">
              Fréquence
            </AppText>
            <OptionGrid options={CUSTOM_SCHEDULES.map((s) => ({ id: s, label: CUSTOM_SCHEDULE_LABELS[s] }))} selected={[role.schedule]} onSelect={(s) => set({ schedule: s as CustomRoleDef['schedule'] })} testID="role-schedule" />
            <ToggleRow label="Peut se cibler lui-même" value={role.canTargetSelf} onChange={(canTargetSelf) => set({ canTargetSelf })} />
            <ToggleRow label="Nombre d’utilisations limité" value={limited} onChange={setLimited} />
            {limited ? <Stepper value={role.uses ?? 1} min={1} max={20} onChange={(uses) => set({ uses })} label="Utilisations" /> : null}
            <AppText variant="overline" tone="muted">
              Ordre de réveil
            </AppText>
            <Stepper value={role.wakeOrder} min={0} max={100} onChange={(wakeOrder) => set({ wakeOrder })} label="Ordre de réveil" testID="role-order" />
            <AppText variant="caption" tone="faint">
              Repères : {ORDER_HINTS}
            </AppText>
          </>
        ) : null}
      </Panel>
      <Panel overline="À sa mort">
        <OptionGrid options={CUSTOM_ON_DEATH.map((d) => ({ id: d, label: CUSTOM_ON_DEATH_LABELS[d] }))} selected={[role.onDeath]} onSelect={(d) => set({ onDeath: d as CustomRoleDef['onDeath'] })} testID="role-ondeath" />
      </Panel>
      <View style={styles.spacer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  multi: { minHeight: 90, textAlignVertical: 'top', paddingTop: spacing.md },
  spacer: { height: spacing.lg },
});
