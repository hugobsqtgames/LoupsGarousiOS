# Architecture

## Vue d’ensemble

```
 Écrans (src/screens, src/app)          ← affichage, saisie, retours visuels/sonores
        │  actions (GameAction)          ↑ état calculé (GameState)
 Stores (src/state)  ── Timeline ──────► Moteur (src/engine) : pur, déterministe, testable seul
        │  enregistrement (record = configuration + actions)
 Dépôt (src/storage) ── SqlDriver ──────► expo-sqlite (iOS/Android/web) · node:sqlite (tests)
```

Le moteur ne connaît ni React, ni le stockage, ni l’audio. L’interface ne contient aucune règle : elle appelle `dispatch(action)` et affiche l’état renvoyé.

## Moteur de règles (`src/engine`)

### Sourçage d’événements

Une partie est définie par :

- **`GameSetup`** : joueurs (ordre = places autour de la table), rôles attribués, cartes hors jeu, variantes, rôles personnalisés, groupes du Sectaire ;
- **`TimedAction[]`** : la liste ordonnée des actions déclarées par le MJ (`night/submit`, `night/resolve`, `ballot/vote`, `decision/resolve`, …).

L’état (`GameState`) est **toujours recalculé** : `état = rejouer(configuration, actions)`. Conséquences :

- reproductibilité : le même enregistrement donne exactement le même état (vérifié par les tests de rejeu et le fuzzing) ;
- annulation = retirer la dernière action ; retour arrière = tronquer ; **correction** = remplacer une action passée puis rejouer toutes les suivantes. Si une action ultérieure devient impossible (ex. vote contre un joueur désormais mort), rien n’est appliqué et l’interface propose explicitement de supprimer la suite ;
- les événements dérivés (morts, protections, votes…) sont écrits dans un journal (`LogEntry`, marqué `secret` pour les informations de nuit) ;
- séparation : actions déclarées (`GameAction`) / validation (`RuleError`) / résolution (`night/resolve.ts`, `deaths.ts`, `ballot.ts`) / résultats calculés (`GameState`, `victory.ts`).

### Modules

| Fichier | Rôle |
| --- | --- |
| `types.ts` | types explicites : rôles, joueurs, phases, actions, scrutins, décisions, événements |
| `roles/catalog.ts` | 30 rôles : camp, pouvoir, moment, utilisations, cibles, restrictions, interactions, sources, certitude, ordre de nuit, poids d’équilibrage |
| `roles/custom.ts`, `roles/registry.ts` | rôles personnalisés **déclaratifs** (listes fermées validées), registre unifié |
| `variants.ts` | variantes, valeurs par défaut, descriptions, détection d’incohérences, normalisation (anciens formats) |
| `setup.ts` | validation de la composition, état initial |
| `night/steps.ts` | calcul **dynamique** des étapes de la nuit (recalculé après chaque choix) |
| `night/choices.ts` | validation des choix, reconstruction de la nuit depuis l’instantané de début de nuit (une correction en amont invalide proprement les choix dépendants) |
| `night/resolve.ts` | résolution de l’aube : épée rouillée, protections, informations, infection, attaques, potions, charmes, Corbeau, ours |
| `deaths.ts` | morts en chaîne avec garde anti-boucle : Amoureux, Chasseur, maire, Ancien, Chevalier, Enfant sauvage, Ange ; un joueur ne meurt qu’une fois |
| `ballot.ts` | scrutins : opérations +/− tracées (jamais un simple compteur global), votants identifiés ou anonymes, poids, Corbeau, égalités, seconds tours |
| `victory.ts` | conditions de victoire, évaluées **uniquement sans décision en attente** et jamais pendant la nuit |
| `reducer.ts` | application d’une action à un brouillon d’état |
| `replay.ts`, `timeline.ts` | rejeu, annulation, correction ; la `Timeline` garde un point de contrôle toutes les 20 actions (annulation rapide sur les longues parties) |
| `composition.ts` | composition automatique expliquée |
| `invariants.ts`, `fuzz.ts` | invariants métier et générateur de parties aléatoires à graine |
| `format.ts` | textes français des événements et actions |

### Copie d’état

Chaque action est appliquée à une copie (`cloneState`) ; les parties immuables (configuration, entrées du journal, instantané de nuit) sont partagées. Cela a divisé par ~5 le temps des tests aléatoires (copie quadratique du journal auparavant).

## Persistance (`src/storage`)

- **SQLite** via `expo-sqlite` (web : wasm + en-têtes COOP/COEP), interface `SqlDriver` minimale ; les tests utilisent le vrai moteur SQLite de Node (`node:sqlite`).
- **Migrations versionnées** (`PRAGMA user_version`), chacune dans une transaction : une migration interrompue est annulée ; une base plus récente que l’app est refusée.
- Table `games` : configuration et actions en JSON, résumé pour les listes, **somme de contrôle** (FNV-1a), nombre d’actions. Table `games_backup` : la version précédente est copiée dans la **même transaction** que l’écriture.
- Chargement : vérification de la somme de contrôle et validation structurelle stricte (types d’action connus uniquement) ; repli automatique sur la copie de secours ; rejeu et signalement de l’action fautive si l’historique est incohérent.
- **Sauvegarde automatique** (`SaveScheduler`) : une écriture à la fois, seule la dernière version en attente est écrite ; l’indicateur « Enregistré » n’apparaît qu’après une écriture réussie ; en cas d’échec : « Non enregistré · Réessayer ».
- Toutes les opérations du dépôt sont sérialisées (`SerialQueue`) : pas de transactions concurrentes.
- Export/import JSON : tout est validé (et chaque partie rejouée) **avant** la moindre écriture, puis écrit en une transaction ; une partie dont l’identifiant existe déjà est importée en copie.
- Paramètres : validés à la lecture (`normalizeSettings`) ; une écriture échouée restaure l’ancienne valeur et l’erreur est affichée.

## État applicatif (`src/state`)

- `app-store` : initialisation, paramètres, listes (parties, compositions, rôles personnalisés), export/import.
- `game-store` : partie ouverte (Timeline), dispatch, annulation, retour arrière, correction, statut de sauvegarde.
- `draft-store` : brouillon de l’assistant de création, conservé en base (survit à une fermeture).

## Interface

- Expo Router (pile), routes fines dans `src/app`, écrans dans `src/screens`.
- Design system : `theme/themes.ts` (4 thèmes + mode discret, contrastes WCAG testés), `components/` (boutons avec garde anti-double-appui de 450 ms, panneaux, grilles de sélection à grandes zones tactiles, feuilles modales, dialogues de confirmation, notifications).
- Icônes : jeu SVG dessiné pour l’app (`react-native-svg`), aucune police d’icônes.
- Polices locales : Cinzel (titres) et Inter (texte), embarquées.
- Zones de sécurité, clavier (`KeyboardAvoidingView`), orientation portrait.

## Audio (`src/audio`)

`AudioManager` (testé avec un faux lecteur) : une seule ambiance (nuit/village), un lecteur réutilisé par effet, sourdine et mode discret, pause en arrière-plan, volumes indépendants appliqués immédiatement, erreurs captées et exposées (un son manquant ne bloque jamais l’app). Narration : synthèse vocale de l’appareil via `expo-speech` (voix française, hors ligne), uniquement des phrases génériques (aucun nom, aucun secret). Sons : générés par synthèse procédurale (`scripts/generate-audio.mjs`), donc sans problème de licence.

## Décisions techniques

| Décision | Raison |
| --- | --- |
| Sourçage d’événements | annulation/correction fiables, reproductibilité, tests de rejeu |
| SQLite plutôt que clé-valeur | écritures transactionnelles (partie + secours), migrations, volumes |
| zustand | stores simples, accessibles hors React (tests, services) |
| Expo Router | navigation par fichiers recommandée par Expo |
| Routes web non asynchrones | la version web fonctionne aussi réseau coupé |
| Sons synthétisés | ressources locales, licence maîtrisée |
| `expo-speech` | narration réelle sans fichiers ni réseau |
