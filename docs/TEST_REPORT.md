# Rapport de tests

Environnement : conteneur Linux (4 cœurs), Node 22.22, Chromium (Playwright 1.56). **Aucun simulateur iOS ni appareil physique n’était disponible** : les tests natifs iOS restent à faire (voir la fin du document). Date : 23 octobre 2026 (mise à jour après la série d’améliorations).

## Synthèse

| Niveau | Outil | Résultat |
| --- | --- | --- |
| Typage | `tsc --noEmit` (strict, `noUnused*`) | 0 erreur |
| Lint | `expo lint` (règles Expo + React Compiler) | 0 erreur, 0 avertissement |
| Diagnostic Expo | `expo-doctor` | 20/20 (après `expo install --fix` : 10 correctifs SDK 58) |
| Unitaires + intégration | Jest (jest-expo) | **24 suites, 204 tests passés**, 0 échec sur l’exécution finale (2 générateurs ignorés hors demande) ; 1 échec intermittent observé sur 4 exécutions (voir BUGS) |
| Bout en bout | Playwright sur l’export web | **11 tests passés** sur l’exécution finale (partie complète, corrections, hors ligne, 4 parcours des nouveautés, 3 monkey tests de 250 gestes — 89 à 116 contrôles distincts —, mesures) + 5 tests de captures lancés à part (58 captures) ; session longue de **1 000 gestes** (graine 101, 209 contrôles distincts) : 0 erreur JavaScript |
| Bundle iOS | `expo export -p ios` | compile (bytecode Hermes, 4,9 Mo) — revérifié après les ajouts |
| Projet natif iOS | `expo prebuild -p ios` (copie temporaire) | généré ; `Info.plist` inspecté |

Couverture Jest (toutes les sources, hors routes) : lignes 73,1 %, instructions 70,5 %, branches 60,3 %. Moteur + stockage seuls : **lignes 88,1 %**, instructions 84,1 %, branches 73,7 %, fonctions 86,7 % (les nouveaux écrans sont surtout couverts par les tests E2E). Les écrans sont surtout couverts par les tests E2E (non comptés dans ces chiffres).

## Tests unitaires du moteur (`src/engine/__tests__`)

- `basic` (17) : ordre de la nuit, Amoureux, potions, chaîne Chasseur → Amoureux, victoires (village, loups, couple mixte, personne), victoire différée tant que le tir du Chasseur est en attente, masquage des secrets.
- `ballot` (25) : candidatures, second tour, départage, succession (désignation et nouvelle élection), +/− sans passer sous zéro, plafond de votants, vote contre un mort refusé, voix du maire ×2 et départage, égalités (maire, second tour, personne), votes blancs, réouverture et correction, annulation exacte, mode nominatif (réattribution, Idiot révélé, morts, Amoureux), Bouc émissaire, Corbeau, Juge bègue, Servante (acceptation / refus).
- `roles` (35) : Salvateur (pas la potion de mort, pas deux fois, variante auto-protection), Ancien (deux vies, protection non consommée, vengeance, variante), Renard, ours (voisins vivants), Chevalier, Enfant sauvage (+ variante), Chien-loup, Voleur (cartes, obligation, correction invalidant les choix dépendants), Infect (une fois, protégé, Joueur de flûte), Grand Méchant Loup, Loup blanc, Joueur de flûte, Ange (2 cas), Sectaire, Comédien, Petite Fille, rôles personnalisés (protection, utilisations, tir ; tueur bloqué), appels pour la forme.
- `replay` (5), `timeline` (4) : rejeu identique, annulations successives, retour arrière, correction recalculée, correction rendant une action ultérieure invalide (signalée, rien appliqué), chargement d’un enregistrement corrompu, équivalence Timeline / rejeu complet.
- `official-rules` (31) : règles vérifiées dans les livrets (Petite Fille non protégeable, Ancien insensible à l’infection, Chevalier et loups responsables, Idiot maire, Servante « comme une première nuit », Servante maire / infectée, Ange amoureux ou repris, variantes Grand Méchant Loup / Loup blanc / Sœurs / Ancien-Idiot, appels du Juge et du Montreur), Gitane, cartes Événement (premier matin, pioche, Spiritisme, Pile ou face, Retour de flamme ×2), outils du MJ, mains levées (plafond, atomicité), conditions de victoire des rôles personnalisés.
- `narration` (10) : annonce de l’aube (aucune cause trahie, 4 styles, déterministe, Ensevelissement), rappels contextuels, chronologie, **rejeu pas à pas identique au rejeu complet**, équilibrage appris.
- `composition` (6) : table des loups, reproductibilité, **5 à 40 joueurs × 3 complexités × 4 graines** toujours valides et dans la plage d’équilibre, jeu de base seul, Voleur + Comédien.

## Tests aléatoires (« fuzzing » du moteur)

`fuzz.ts` génère des parties entières à partir d’une graine : composition automatique (5–24 joueurs, toutes complexités, Voleur/Comédien), variantes tirées au hasard, puis actions aléatoires — y compris **invalides** (cibles mortes, étapes inconnues, décisions bidon), corrections d’étapes passées, annulations et retours arrière aléatoires. Après **chaque** action : vérification des invariants (`invariants.ts` : morts uniques et cohérentes, compteurs jamais négatifs, plafond de votants, Amoureux, maire, un seul scrutin actif, choix nocturnes orphelins, victoire sans décision en attente…). En fin de partie : rejeu complet et comparaison octet par octet avec l’état obtenu.

| Campagne | Résultat |
| --- | --- |
| Suite standard : 200 graines | 0 violation |
| Campagne prolongée : `FUZZ_SEEDS=1000` (nouvelles actions et variantes incluses) | 0 violation (129 s) |
| Statistiques (100 graines, 1001–1100) | 29 583 actions tentées, 21 228 appliquées, 8 355 rejetées proprement, 1 230 annulations/retours ; issues : loups 44, village 26, Amoureux 4, Ange 2, personne 1, non terminées (limite de 600 actions) 23 |

Le fuzzing tire aussi les nouvelles variantes et actions (événements, mains levées, retour en jeu, changement de camp, potion rendue, vote supplémentaire, destitution, grâce) ; un test vérifie qu’elles sont **réellement appliquées** (et non seulement rejetées) : sur 100 graines, 371 saisies à main levée, 63 tirages d’événements, 198 votes supplémentaires, 21 retours en jeu, 22 destitutions, 15 changements de camp.

Rejouer un échec : `fuzzGame(graine)`.

## Stress

- Partie à **40 joueurs**, 7 rôles spéciaux, 200 corrections +/− par scrutin : 1 278 actions, 108 Ko de données, rejeu complet en 0,8 s (Node), état identique.
- 200 parties enregistrées puis listées : < 10 s (exigence du test), effacement contrôlé.
- Partie de mesure de 2 024 actions (voir performances).

## Persistance (`src/storage/__tests__`, 19 tests, vrai SQLite)

Migrations (création, idempotence, migration depuis un schéma antérieur avec conservation des données, **migration en échec entièrement annulée**, base plus récente refusée), aller-retour exact, **repli sur la copie de secours** après altération, erreur claire si tout est illisible, détection de l’action fautive dans un historique incohérent, rejet d’un type d’action inconnu, **échec d’écriture simulé** (promesse rejetée, version précédente intacte), sauvegardes concurrentes sérialisées, suppression, paramètres, compositions, rôles personnalisés invalides refusés, export/import (aller-retour, renommage des doublons, fichier mal formé ou partie incohérente refusés **sans aucune écriture**), volume.

## Autres modules

- Audio (8) : ambiance unique, réutilisation des lecteurs, sourdine/mode discret, volumes immédiats, arrière-plan, **son manquant sans plantage**, narration, libération.
- Sauvegarde automatique (3) : « Enregistré » seulement après réussite, dernière version gagnante, erreur puis « Réessayer ».
- Paramètres (3) : valeurs invalides ou manquantes normalisées. Thèmes (8) : **contrastes WCAG** (texte ≥ 7:1, texte secondaire ≥ 4,5:1, boutons ≥ 4,5:1, mode discret ≥ 4,5:1).
- Brouillon de partie (6), statistiques globales et **par joueur** (5), résumés anciens recalculés à l’ouverture (dépôt).
- Illustrations (4) : chaque rôle a une carte, SVG bien formé, déterministe, distinct ; titre échappé. Contraste élevé : texte secondaire ≥ 7:1 sur tous les thèmes. Paramètres et ambiances (pluie / orage selon le thème).
- **Audit d’accessibilité automatisé** (`a11y.test.tsx`) : tableau de bord, nuit, paramètres, statistiques, catalogue, création — chaque contrôle interactif a un rôle et un nom prononçable par VoiceOver (au moins 5 contrôles vérifiés par écran) : 0 défaut.

## Intégration UI (`src/__tests__/integration`, vrais écrans + vraie base)

- Création : ajout, doublon refusé, blocage sous 5 joueurs.
- **Partie complète** : assistant, composition automatique, lancement, nuit entière, aube et décisions, élection du maire avec correction d’une voix, vote d’élimination avec annulation de la dernière opération, sauvegarde confirmée sur disque, fermeture puis réouverture : **état strictement identique**.
- Paramètres : thème et volume enregistrés ; **échec d’écriture** → valeur restaurée et message affiché ; mode discret.
- Catalogue : recherche, fiche avec sources, favori ; création d’un rôle personnalisé validé.

## Bout en bout (Playwright, export web dans Chromium, viewport iPhone)

| Test | Vérifie |
| --- | --- |
| `full-game` | création manuelle (5 joueurs), Voyante (résultat), loups, Sorcière, aube, **rechargement de la page en pleine partie** puis reprise depuis l’accueil, maire 3 voix, vote pondéré par le maire, victoire du village, résumé, statistiques, liste des parties, aucune erreur console |
| `corrections` | Cupidon + Chasseur : **correction de l’étape des loups** via la frise, mort de chagrin, tir obligatoire avant le jour, victoire détectée après le tir, annulation, retour arrière avant la résolution |
| `offline` | **aucune requête hors de localhost**, puis réseau coupé : création et lancement d’une partie |
| `monkey` ×3 | graines 11, 23, 37 : 250 gestes chacune (appuis aux coordonnées comme un doigt, rafales, saisies aléatoires, retours, rechargements), 89 à 116 contrôles distincts ; plus une session de 1 000 gestes (209 contrôles) ; aucune erreur JS, jamais d’écran durablement vide |
| `features` ×4 | **distribution sur le téléphone** (appui court sans effet, appui long révèle), **Voleur** découvrant les cartes du centre en privé puis revoyant son nouveau rôle ; **mains levées** (pavé, plafond refusé), **minuteur**, annonce, chronologie, **plan de table** (voisins), **rejeu** ; **Nouvelle Lune** (aucun tirage au premier matin, tirage, Pile ou face → grâce) ; **iPad paysage** (deux colonnes vérifiées par position) |
| `screenshots` + `screenshots-new` | 58 captures réelles (`docs/screenshots/web`), dont iPad 1180 × 820 |
| `perf` | mesures ci-dessous |

## Performances (mesurées, Chromium sur la machine de CI — pas un iPhone)

| Mesure | Valeur |
| --- | --- |
| Démarrage à froid jusqu’à l’accueil interactif | 0,76 s (DOMContentLoaded 0,23 s) |
| Import d’une partie de 2 024 actions | 1,27 s (recalcul du détail par joueur inclus) |
| Ouverture de cette partie (rejeu complet) | 1,46 s |
| Annulation sur cette partie (points de contrôle) | 0,22 s |
| Tas JavaScript après ces opérations | 45 Mo |
| Rejeu de 1 278 actions (Node) | 0,8 s |
| Taille d’une partie de 2 024 actions | 169 Ko (JSON) |

Avant optimisation, la copie de l’état était quadratique (journal copié à chaque action) : 300 parties aléatoires prenaient 111 s, contre ~20 s ensuite.

## Audit hors ligne et confidentialité

- Code applicatif : aucun `fetch`, `XMLHttpRequest`, `WebSocket`, ni URL distante (recherche exhaustive dans `src/`).
- Polices, sons, icônes : fichiers locaux. Narration : voix de l’appareil.
- Test E2E : 0 requête externe ; partie jouable réseau coupé (version web avec routes non asynchrones).
- `Info.plist` généré : **aucune clé `NS…UsageDescription`** (ni micro, ni caméra, ni localisation), `UIBackgroundModes` vide, aucun entitlement, chiffrement non soumis à déclaration. Enregistrement audio désactivé dans le plugin expo-audio ; permission Android `RECORD_AUDIO` bloquée.
- Portée limitée : le comportement réseau des bibliothèques natives iOS n’a pas pu être observé sur appareil (pas de capture réseau iOS possible ici).

## Non vérifié dans cet environnement (à faire sur Mac / iPhone)

1. Nouveautés non vérifiables ici : **conversion PNG de l’image récapitulative sur iOS** (`toDataURL`), feuille de partage, glisser-déposer du plan de table et appui long au doigt, vibration du minuteur, VoiceOver réel, iPad réel (rotation, Split View).
2. Rendu et ergonomie **natifs iOS** (polices, zones de sécurité, Dynamic Island, clavier, gestes de retour, VoiceOver, Dynamic Type).
3. Lecture audio native (expo-audio), interruptions (appel entrant), interrupteur silencieux, synthèse vocale française (expo-speech).
4. Retour haptique, écran maintenu allumé.
5. SQLite natif (WAL), fermeture forcée de l’app pendant une écriture, migration sur un appareil réel.
6. Feuille de partage iOS (export) et sélecteur de fichiers (import).
7. Mesures de démarrage et de mémoire sur iPhone.

Procédure : `npx expo run:ios` (ou `npx eas-cli build -p ios --profile development`), puis rejouer manuellement les parcours des tests E2E ; Maestro ou Detox peuvent automatiser ces parcours (les `testID` sont déjà en place).
