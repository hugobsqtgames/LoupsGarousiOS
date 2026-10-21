# Bugs corrigés et problèmes ouverts

## Défauts détectés puis corrigés

| # | Défaut | Détecté par | Correction | Non-régression |
| --- | --- | --- | --- | --- |
| 1 | Le Simple Villageois était limité à 30 exemplaires alors que 40 joueurs sont acceptés : composition automatique invalide au-delà de 32 joueurs | test de composition 5–40 joueurs | plafond relevé | `composition.test.ts` |
| 2 | Copie de l’état quadratique (journal recopié à chaque action) : tests aléatoires 5× trop lents, annulation lente sur de longues parties | mesure du fuzzing | partage des parties immuables + `Timeline` à points de contrôle | `timeline.test.ts`, `stress.test.ts`, `perf.spec.ts` |
| 3 | L’import levait une exception synchrone au lieu de rejeter sa promesse | test de persistance | méthodes asynchrones | `repository.test.ts` |
| 4 | Si le module haptique ne renvoyait pas de promesse, l’appui sur un bouton échouait silencieusement **avant** l’action | test d’intégration (ajout de joueur perdu) | retour haptique isolé et sans conséquence | `setup-flow.test.tsx` |
| 5 | Retour au tableau de bord par `replace` : plusieurs tableaux de bord empilés (sélecteurs ambigus, navigation incohérente) | exploration Playwright | `dismissTo` vers le tableau de bord / l’accueil | E2E |
| 6 | Option de pile déclarée au mauvais niveau (avertissement de navigation) | console | option déplacée dans la pile de la partie | E2E (console sans erreur) |
| 7 | Après validation d’un scrutin, l’écran rouvrait le formulaire au lieu d’afficher le résultat | exploration Playwright | vue « Scrutin validé » | `game-flow.test.tsx`, E2E |
| 8 | Réinitialisation du formulaire de nuit par un effet (rendus en cascade, signalé par le compilateur React) | lint | saisies indexées par étape | E2E `corrections` |
| 9 | Composant créé pendant le rendu, référence modifiée pendant le rendu (audio) | lint | composant extrait, ref mise à jour dans un effet | lint |
| 10 | Silhouette de forêt du décor passant derrière le sous-titre et le bouton principal | capture d’écran | décor calé sur la hauteur réelle de l’en-tête | captures |
| 11 | Sur une ligne joueur, un appui sur « rôle masqué » ne faisait que révéler le rôle au lieu d’ouvrir la fiche | test de captures | appui court = fiche, appui long = révéler | captures |
| 12 | Libellés tronqués ou coupés (« Personnage s », « Favori s », options de l’éditeur de rôle) | revue des captures | libellés courts, 2 lignes autorisées | captures |
| 13 | Avec 10 joueurs, le compteur général du vote sortait de l’écran pendant la saisie | comparaison maquette / réel | résumé compact fixé au-dessus de « Clôturer » | captures |
| 14 | Version web inutilisable réseau coupé (écrans chargés à la demande) | test E2E hors ligne | routes non asynchrones | `offline.spec.ts` |
| 15 | Dépendance `expo-asset` manquante pour `expo-audio` (risque de plantage hors Expo Go) | `expo-doctor` | dépendance installée | `expo-doctor` 20/20 |
| 16 | Manifeste de confidentialité iOS sans les API à justification | inspection du projet natif généré | déclarations ajoutées dans `app.json` | prebuild |
| 17 | Tests d’intégration bloqués ou instables (événements RNTL v14 non attendus, minuteurs simulés, `waitFor` asynchrone) | exécutions répétées | événements attendus, horloge simulée avancée explicitement | 12 exécutions consécutives stables |

Incident de processus (non applicatif) : la copie initiale du modèle Expo avait remplacé le dossier `.git` du dépôt ; détecté avant tout envoi, la branche demandée a été recréée proprement.

## Problèmes ouverts et limites connues

| Sujet | État |
| --- | --- |
| Tests natifs iOS (rendu, audio, haptique, SQLite natif, partage) | **non réalisés** : aucun simulateur dans l’environnement |
| Règles | issues de résumés tiers ; points incertains listés dans `RULES.md` et rendus configurables |
| Gitane, événements *Nouvelle Lune*, *Le Village*, *Le Pacte* | non implémentés |
| Comédien | cartes limitées à Voyante, Salvateur, Renard, Corbeau, Sorcière, Simple Villageois |
| Solitaire personnalisé | pas de condition de victoire propre |
| Correction d’une action passée | directe pour les actions à cible unique ; les autres se corrigent par « Revenir ici » puis nouvelle saisie |
| Ordre de nuit | fixe pour les rôles intégrés (réglable pour les rôles personnalisés) |
| Deux Sœurs / Trois Frères | réveils ultérieurs facultatifs non guidés |
| Orientation | portrait uniquement ; iPad non ciblé |
| Indice d’équilibre | heuristique, non validé statistiquement |
| Narration | dépend des voix françaises installées sur l’appareil |
| Couverture des branches des écrans | partielle (surtout testés en E2E) |
