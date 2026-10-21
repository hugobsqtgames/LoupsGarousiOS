# Rapport de tests

Environnement : conteneur Linux (4 cœurs), Node 22.22, Chromium (Playwright 1.56). **Aucun simulateur iOS ni appareil physique n’était disponible** : les tests natifs iOS restent à faire (voir la fin du document). Date : 21 octobre 2026.

## Synthèse

| Niveau | Outil | Résultat |
| --- | --- | --- |
| Typage | `tsc --noEmit` (strict, `noUnused*`) | 0 erreur |
| Lint | `expo lint` (règles Expo + React Compiler) | 0 erreur, 0 avertissement |
| Diagnostic Expo | `expo-doctor` | 20/20 |
| Unitaires + intégration | Jest (jest-expo) | **20 suites, 149 tests passés**, 0 échec (1 générateur de données de mesure ignoré hors demande) |
| Bout en bout | Playwright sur l’export web | **8 tests passés** (partie complète, corrections, hors ligne, 3 monkey tests, captures, mesures) |
| Bundle iOS | `expo export -p ios` | compile (bytecode Hermes, 4,9 Mo) |
| Projet natif iOS | `expo prebuild -p ios` (copie temporaire) | généré ; `Info.plist` inspecté |

Couverture Jest (toutes les sources, hors routes) : lignes 75,9 %, instructions 72,6 %, branches 62,0 %. Moteur + stockage seuls : **lignes 89,3 %**, instructions 85,1 %, branches 75,7 %, fonctions 87,8 %. Les écrans sont surtout couverts par les tests E2E (non comptés dans ces chiffres).

## Tests unitaires du moteur (`src/engine/__tests__`)

- `basic` (17) : ordre de la nuit, Amoureux, potions, chaîne Chasseur → Amoureux, victoires (village, loups, couple mixte, personne), victoire différée tant que le tir du Chasseur est en attente, masquage des secrets.
- `ballot` (25) : candidatures, second tour, départage, succession (désignation et nouvelle élection), +/− sans passer sous zéro, plafond de votants, vote contre un mort refusé, voix du maire ×2 et départage, égalités (maire, second tour, personne), votes blancs, réouverture et correction, annulation exacte, mode nominatif (réattribution, Idiot révélé, morts, Amoureux), Bouc émissaire, Corbeau, Juge bègue, Servante (acceptation / refus).
- `roles` (35) : Salvateur (pas la potion de mort, pas deux fois, variante auto-protection), Ancien (deux vies, protection non consommée, vengeance, variante), Renard, ours (voisins vivants), Chevalier, Enfant sauvage (+ variante), Chien-loup, Voleur (cartes, obligation, correction invalidant les choix dépendants), Infect (une fois, protégé, Joueur de flûte), Grand Méchant Loup, Loup blanc, Joueur de flûte, Ange (2 cas), Sectaire, Comédien, Petite Fille, rôles personnalisés (protection, utilisations, tir ; tueur bloqué), appels pour la forme.
- `replay` (5), `timeline` (4) : rejeu identique, annulations successives, retour arrière, correction recalculée, correction rendant une action ultérieure invalide (signalée, rien appliqué), chargement d’un enregistrement corrompu, équivalence Timeline / rejeu complet.
- `composition` (6) : table des loups, reproductibilité, **5 à 40 joueurs × 3 complexités × 4 graines** toujours valides et dans la plage d’équilibre, jeu de base seul, Voleur + Comédien.

## Tests aléatoires (« fuzzing » du moteur)

`fuzz.ts` génère des parties entières à partir d’une graine : composition automatique (5–24 joueurs, toutes complexités, Voleur/Comédien), variantes tirées au hasard, puis actions aléatoires — y compris **invalides** (cibles mortes, étapes inconnues, décisions bidon), corrections d’étapes passées, annulations et retours arrière aléatoires. Après **chaque** action : vérification des invariants (`invariants.ts` : morts uniques et cohérentes, compteurs jamais négatifs, plafond de votants, Amoureux, maire, un seul scrutin actif, choix nocturnes orphelins, victoire sans décision en attente…). En fin de partie : rejeu complet et comparaison octet par octet avec l’état obtenu.

| Campagne | Résultat |
| --- | --- |
| Suite standard : 200 graines | 0 violation |
| Campagne prolongée : `FUZZ_SEEDS=1000` | 0 violation (89 s) |
| Statistiques (100 graines, 1001–1100) | 29 583 actions tentées, 21 228 appliquées, 8 355 rejetées proprement, 1 230 annulations/retours ; issues : loups 44, village 26, Amoureux 4, Ange 2, personne 1, non terminées (limite de 600 actions) 23 |

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
- Brouillon de partie (6), statistiques (2).

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
| `monkey` ×3 | graines 11, 23, 37 : 250 gestes chacune (appuis en rafale, saisies aléatoires, retours, rechargements), ~75–87 contrôles distincts ; aucune erreur JS, jamais d’écran durablement vide |
| `screenshots` | 37 captures réelles (`docs/screenshots/web`) |
| `perf` | mesures ci-dessous |

## Performances (mesurées, Chromium sur la machine de CI — pas un iPhone)

| Mesure | Valeur |
| --- | --- |
| Démarrage à froid jusqu’à l’accueil interactif | 0,86 s (DOMContentLoaded 0,28 s) |
| Import d’une partie de 2 024 actions | 0,88 s |
| Ouverture de cette partie (rejeu complet) | 1,25 s |
| Annulation sur cette partie (points de contrôle) | 0,21 s |
| Tas JavaScript après ces opérations | 33 Mo |
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

1. Rendu et ergonomie **natifs iOS** (polices, zones de sécurité, Dynamic Island, clavier, gestes de retour, VoiceOver, Dynamic Type).
2. Lecture audio native (expo-audio), interruptions (appel entrant), interrupteur silencieux, synthèse vocale française (expo-speech).
3. Retour haptique, écran maintenu allumé.
4. SQLite natif (WAL), fermeture forcée de l’app pendant une écriture, migration sur un appareil réel.
5. Feuille de partage iOS (export) et sélecteur de fichiers (import).
6. Mesures de démarrage et de mémoire sur iPhone.

Procédure : `npx expo run:ios` (ou `npx eas-cli build -p ios --profile development`), puis rejouer manuellement les parcours des tests E2E ; Maestro ou Detox peuvent automatiser ces parcours (les `testID` sont déjà en place).
