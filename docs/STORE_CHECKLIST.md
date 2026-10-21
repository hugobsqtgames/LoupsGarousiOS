# Avant une publication sur l’App Store

L’application **n’est pas prête à être publiée** tant que les points suivants n’ont pas été vérifiés sur un vrai iPhone.

## Bloquant

1. **Build natif** : `npx eas-cli build -p ios --profile development` (ou `npx expo run:ios` sur Mac) ; corriger toute erreur de compilation native.
2. **Tests manuels sur iPhone** (au moins un petit écran type SE et un grand modèle à Dynamic Island) : rejouer les parcours de `e2e/full-game.spec.ts` et `e2e/corrections.spec.ts`, le mode discret, les quatre thèmes.
3. **Audio** : ambiances, effets, narration française, interrupteur silencieux, appel entrant pendant une partie, passage en arrière-plan.
4. **Données** : fermeture forcée pendant une nuit puis réouverture ; export par la feuille de partage, import depuis Fichiers ; mise à jour de l’app avec données existantes.
5. **Accessibilité** : VoiceOver sur les écrans de nuit et de vote, Dynamic Type, contrastes en extérieur.
6. **Mode avion** : création, partie complète, export.
7. **Rapport de confidentialité Xcode** : vérifier que le manifeste agrégé couvre toutes les API à justification des dépendances.

## Préparation App Store Connect

- Compte Apple Developer, identifiant `com.hugobsqtgames.loupsgarousmj` (à confirmer), `eas.json` fourni (profils development / preview / production).
- Fiche : nom, sous-titre, description, mots-clés, captures **natives** (6,9" et 6,5"), catégorie Jeux › Jeux de société.
- Confidentialité : « Aucune donnée collectée » (aucune donnée ne quitte l’appareil) ; URL de politique de confidentialité exigée par Apple.
- Classement d’âge.
- Propriété intellectuelle : *Les Loups-garous de Thiercelieux* est une marque déposée ; ne pas utiliser le nom ni les visuels officiels dans la fiche sans autorisation (l’app ne contient ni illustrations ni textes du livret).
- Version / numéro de build gérés par EAS (`autoIncrement`).
