import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icon';
import { Panel } from '@/components/panel';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useTheme } from '@/theme/theme-context';
import { spacing } from '@/theme/themes';

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'Principe',
    body: [
      'Les joueurs utilisent leurs cartes physiques ; seul le MJ utilise l’application.',
      'Tout fonctionne hors ligne : aucune connexion, aucun compte, aucune donnée envoyée.',
    ],
  },
  {
    title: 'Créer une partie',
    body: [
      '1. Saisissez les joueurs dans l’ordre des places autour de la table (sens horaire).',
      '2. Choisissez les cartes à la main ou laissez la composition automatique proposer un ensemble équilibré (les raisons de chaque choix sont affichées).',
      '3. Laissez l’app tirer les rôles au sort, ou saisissez les cartes que chaque joueur a reçues.',
      '4. Ajustez les variantes de règles, vérifiez le récapitulatif, puis lancez.',
    ],
  },
  {
    title: 'La nuit',
    body: [
      'Le guide présente chaque rôle à réveiller dans l’ordre officiel, avec la phrase à prononcer.',
      'Les rôles morts ou absents sont aussi appelés « pour la forme » (variante activable) afin de ne rien révéler.',
      'Touchez une étape déjà validée dans la frise pour la corriger avant de résoudre la nuit.',
      'La résolution calcule protections, potions, morts en chaîne et effets différés.',
    ],
  },
  {
    title: 'L’aube',
    body: ['Le bilan sépare ce qu’il faut annoncer au village et les détails réservés au MJ.', 'Les décisions (tir du Chasseur, succession du maire…) doivent être prises avant de passer au jour.'],
  },
  {
    title: 'Votes',
    body: [
      'Mode compteur : touchez une ligne ou « + » pour ajouter une voix, « − » pour en retirer une.',
      'Mode nominatif : choisissez le votant, puis sa cible ; un nouveau choix remplace le précédent.',
      'Le vote du maire se saisit à part (il compte double selon la règle de base).',
      'Clôturez le scrutin pour voir le résultat ; vous pouvez encore le rouvrir pour corriger avant de valider.',
      'Égalités : Bouc émissaire, puis maire, puis second tour, selon les variantes.',
    ],
  },
  {
    title: 'Corriger une erreur',
    body: [
      '« Annuler » retire la dernière action et recalcule la partie.',
      'L’historique permet de revenir à n’importe quel point, ou de corriger la cible d’une action passée : la partie est rejouée et les conséquences devenues impossibles sont signalées avant toute suppression.',
    ],
  },
  {
    title: 'Discrétion',
    body: [
      'L’icône en forme d’œil masque les rôles dans les vues générales : maintenez l’appui sur un rôle pour le lire.',
      'Le mode discret assombrit fortement l’interface et coupe tous les sons.',
    ],
  },
  {
    title: 'Sauvegarde',
    body: ['Chaque action est enregistrée immédiatement. L’indicateur « Enregistré » ne s’affiche qu’après une écriture réussie.', 'Une copie de secours de la version précédente est conservée ; l’export JSON permet une sauvegarde externe.'],
  },
  {
    title: 'Règles et incertitudes',
    body: [
      'Chaque rôle indique ses sources et son niveau de certitude (règle officielle confirmée, probable, ou interprétation).',
      'Les interactions non documentées sont configurables dans les variantes ou laissées à la décision du MJ (élimination manuelle, notes).',
    ],
  },
];

export function HelpScreen() {
  const [open, setOpen] = useState<number | null>(0);
  const { colors } = useTheme();
  return (
    <Screen title="Aide" back>
      {SECTIONS.map((s, i) => (
        <Panel key={s.title} padded={false}>
          <Pressable onPress={() => setOpen(open === i ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: open === i }} style={styles.head} testID={`help-${i}`}>
            <AppText variant="heading" style={styles.flex}>
              {s.title}
            </AppText>
            <Icon name={open === i ? 'chevron-up' : 'chevron-down'} color={colors.textMuted} size={18} />
          </Pressable>
          {open === i ? (
            <View style={styles.body}>
              {s.body.map((b) => (
                <AppText key={b} variant="small" tone="muted">
                  {b}
                </AppText>
              ))}
            </View>
          ) : null}
        </Panel>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, minHeight: 56 },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
});
