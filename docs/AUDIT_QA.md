# Audit QA — octobre 2026

État final : **PARTIELLEMENT VALIDÉ**.
- Tout ce qui peut être exécuté ici est validé, **en mode développement et en mode production**.
- L'app iOS native est **compilée par Xcode** (EAS Build) en Debug et en Release.
- Elle n'a **jamais été lancée** sur iOS : le simulateur EAS n'est pas ouvert sur le compte, et il n'y a ni Mac ni iPhone ici.

## 1. Résumé

| Domaine | État |
| --- | --- |
| Moteur de règles (rejeu, annulation, correction) | validé par 3 000 parties de fuzz, 3 000 rejeux après relecture et 2 000 historiques altérés |
| Stockage SQLite (sauvegarde, secours, import/export) | validé sur le moteur SQLite réel (`node:sqlite`) ; le pilote natif `expo-sqlite` n'a pas été exécuté |
| Interface, mode production | validée dans Chromium (export web minifié, `__DEV__=false`) : 15 tests de bout en bout sur 15, sessions monkey, 0 erreur JavaScript |
| Interface, mode développement | validée sur le serveur Metro (`expo start`, React en mode développement) : 15 sur 15, après 4 corrections propres à ce mode (§ 4bis) |
| Build iOS native | **compilée par Xcode 27.1** sur EAS : Debug (build de développement) et Release (simulateur), « BUILD SUCCEEDED » toutes les deux |
| Simulateur / appareil iOS | **non testés** (simulateur EAS non disponible sur le compte : liste d'attente) |

22 défauts ont été trouvés et corrigés (§ 4 et 4bis). Chaque correction a son test de régression, sauf A12, A14 et A15 (§ 4).

## 2. Stack et environnement détectés

- **Application :** Expo SDK 58 (`expo` 58.0.19 après mise à jour), React Native 0.88, React 19.3, TypeScript 6 strict, Expo Router (`src/app`), zustand, expo-sqlite, react-native-svg, React Compiler.
- **Outils :**
  - disponibles : Node 22, npm, Jest 30 + jest-expo, RNTL 14, Playwright 1.56 (Chromium préinstallé), ESLint (eslint-config-expo), expo-doctor ;
  - absents : Xcode, simulateur iOS, Maestro, Detox, identifiants EAS.
- **Données :** 100 % locales (SQLite) ; aucune requête réseau (vérifié par `e2e/offline.spec.ts` et par une recherche de `fetch`, `XMLHttpRequest` et `WebSocket` dans `src/`).

## 3. Ce qui a été inspecté

Le code critique a été lu entièrement :
- `src/storage/` : repository, migrations, validation, pilotes ;
- `src/state/` : game-store, app-store, draft-store, save-scheduler, services ;
- le cycle de vie et l'ouverture des parties : `app/_layout.tsx`, `app/game/[id]/_layout.tsx` ;
- les dialogues et notifications (`components/feedback.tsx`), les feuilles (`sheet.tsx`), les contrôles et boutons ;
- la génération SVG (`art/recap.ts`, `art/role-art.ts`) et le partage d'image ;
- les minuteurs et écouteurs : `debate-timer`, `replay`, `recap-share`, `audio-context`, `use-reduce-motion` ;
- les écrans pilotés par paramètres : joueur, rôle, éditeur de rôle personnalisé ;
- le chargement des compositions dans l'assistant ;
- `app.json` (manifeste de confidentialité, permissions, plugins).

Le moteur a été exploré **par les tests** (fuzz, propriétés), et non relu ligne à ligne.

## 4. Défauts corrigés

| # | Gravité | Défaut | Cause racine | Correction | Test |
| --- | --- | --- | --- | --- | --- |
| A1 | P1 | Deux ouvertures rapprochées : la partie A s'affiche sous l'adresse de B, et les actions vont à A | chargement asynchrone sans jeton | jeton de chargement, résultat périmé ignoré | `state/game-store.test.ts` |
| A2 | P1 | Partie supprimée (ou « tout effacer ») encore servie depuis la mémoire, puis réécrite à l'action suivante | la partie ouverte n'était pas fermée lors d'une suppression | suppression, effacement et import ferment la partie ouverte | idem (2 tests) |
| A3 | P1 | Partie créée non relisible (nom > 64 caractères venu d'un import) ; variantes non normalisées, donc partie jouée ≠ partie rejouée | la création ne passait pas par le validateur de chargement | `create` valide la configuration avec `parseSetup` | idem (2 tests) |
| A4 | P2 | Écriture échouée puis fermeture de la partie : dernières actions perdues sans nouvelle tentative | `close()` libérait le planificateur en erreur | une nouvelle tentative avant de libérer | idem |
| A5 | P2 | Export impossible si une composition ou un rôle personnalisé est illisible : aucune sauvegarde possible | `JSON.parse` / `parseCustomRoles` sans tolérance | lignes illisibles écartées une à une | `storage/__tests__/audit-regressions.test.ts` |
| A6 | P2 | Composition importée sans `playerNames` ni `extraCards` : plantage de l'assistant ; rôles non textuels acceptés | validation d'import trop faible | validation des listes, valeurs par défaut, variantes normalisées | idem |
| A7 | P3 | Partie importée enregistrée avec une version de format fixe (1) | valeur codée en dur | version lue dans la configuration | idem |
| A8 | P2 | Action altérée (champ manquant) : erreur interne au rejeu (rattrapée, mais historique refusé tardivement) | seule la présence du `type` était vérifiée | champs obligatoires vérifiés à la lecture | `campaign/corruption-*.test.ts` |
| A9 | P2 | Identifiants de joueurs dupliqués acceptés depuis un fichier importé | contrôle absent de `parseSetup` | refus explicite | `audit-regressions.test.ts` |
| A10 | P2 | Aucune protection contre les erreurs d'affichage (error boundary) : une erreur de rendu ferme l'app | aucun `ErrorBoundary` exporté | écran de secours (racine + partie) avec « Réessayer » | `integration/error-boundary.test.tsx` |
| A11 | P3 | Dialogue remplacé (double appui) : promesse jamais résolue, parcours suspendu | un seul emplacement de dialogue | le dialogue remplacé est résolu « annulé » | `components/feedback.test.tsx` |
| A12 | P3 | Image arrivée après le délai : partage lancé malgré le message d'échec | rappel tardif non ignoré | drapeau d'expiration | — (relecture) |
| A13 | P2 | Image récapitulative invalide : émoji coupé en deux par la troncature, caractères de contrôle | découpe en unités UTF-16, pas de filtrage | découpe par caractère, filtrage XML | `art/__tests__/svg-safety.test.ts` (300 cas ; 300/300 échouaient avant) |
| A14 | P2 | iOS : le clavier recouvre les champs des feuilles (note du MJ, nom de composition) | pas de `KeyboardAvoidingView` dans `Sheet` | ajouté (iOS) | **non vérifiable ici** (pas d'appareil) |
| A15 | P3 | Segments de 38 pt (sous les 44 pt recommandés par Apple) | hauteur visuelle seule | marge tactile de 4 pt en haut et en bas | — |
| A16 | P3 | Adresse inconnue : écran par défaut en anglais | pas de route `+not-found` | page « Page introuvable » | `e2e/robustness.spec.ts` |
| A17 | P3 | Versions patch en retard sur le SDK (expo, expo-router, expo-sqlite…) | correctifs publiés depuis | `npx expo install --fix` (expo-doctor 20/20) | suites complètes relancées |

Correction de l'outil de test : `fuzz.ts` expose `fuzzPlay` et prend désormais en compte des variantes imposées et des rôles personnalisés. Avant, aucune partie de fuzz ne comportait de rôle personnalisé.

## 4bis. Défauts révélés par le mode développement

Le premier passage de bout en bout s'était fait uniquement sur l'export de production, où React ne signale pas les erreurs de structure. En mode développement :

| # | Gravité | Défaut | Correction | Test |
| --- | --- | --- | --- | --- |
| A18 | P2 | Icônes : propriétés de masquage VoiceOver transmises à la balise `<svg>` (avertissement React ; le bandeau d'erreur du mode développement bloquait les appuis) | masquage porté par une vue englobante | E2E en mode développement (aucune erreur de console tolérée) |
| A19 | P2 | Ligne de joueur : le texte « rôle masqué » était un bouton dans le bouton de la ligne. **Sur iOS, VoiceOver ne peut pas atteindre un bouton imbriqué** | l'appui long qui révèle le rôle est géré par la ligne ; indication VoiceOver « maintenir pour l'afficher » | `a11y.test.tsx` (règle « contrôle imbriqué » ; échouait avant) |
| A20 | P2 | Liste des parties : bouton « Supprimer » dans le bouton « Ouvrir » (inatteignable avec VoiceOver) | deux boutons côte à côte | `a11y.test.tsx` (écran ajouté ; échouait avant) |
| A21 | P3 | Volumes et minuteur : le conteneur « ajustable » n'était pas un élément accessible. Sur iOS, la valeur n'était pas annoncée et le balayage haut/bas ne faisait rien | `accessible` ; boutons − et + réservés au toucher | `settings.test.tsx` (toucher + action VoiceOver) |
| A22 | outil de test | Monkey : attente sans délai d'un contrôle disparu entre le comptage et l'appui (délai dépassé sous charge) | délais de 2 s | 3 graines en parallèle, en mode développement et en production |

L'audit VoiceOver automatisé couvre maintenant 18 écrans (6 auparavant). Il signale tout contrôle placé dans un autre contrôle.

## 5. Tests : chiffres réels

**Tests Jest définis et exécutés : 10 699**
- 10 697 réussis, 0 échec, 2 ignorés ; les 2 ignorés existaient déjà : générateur de fixture de performance et rendu des illustrations, à lancer à la demande.
- Les assertions ne sont pas comptées par Jest : pas de chiffre fourni.
- Une même assertion répétée ne compte pas comme plusieurs tests : chaque cas paramétré a sa propre graine et ses propres données.

Campagne ajoutée par cet audit (`src/__tests__/campaign/`, 10 180 tests) :

| Fichier | Tests | Ce qui est vérifié |
| --- | --- | --- |
| `persistence-1..3` | 3 000 | 1 500 parties aléatoires. Relecture JSON + validateurs, puis rejeu identique, invariants, affichage dérivé (annonces × 4 styles, chronologie, rappels, journal). 3 retours en arrière par partie = rejeu du préfixe et lecteur pas à pas |
| `corruption-1..2` | 2 000 | Historiques altérés (suppression, doublon, permutation, champ supprimé ou corrompu, altération en profondeur). Résultat attendu : refus propre (`DataError`) ou rejeu cohérent et déterministe |
| `storage` | 760 | 300 × SQLite : écriture/lecture, octet altéré → copie de secours, deux versions altérées → erreur explicite. 60 × écritures concurrentes. 400 × import altéré : tout ou rien (base inchangée en cas de refus), aller-retour export/import |
| `variants` | 656 | Chaque valeur de chaque variante (8 parties chacune) et 10 paires de variantes à risque, toutes combinaisons de valeurs |
| `setup` | 3 164 | 864 compositions automatiques (5 à 40 joueurs × 3 complexités × 4 jeux d'extensions × solitaires oui/non). 500 distributions N+2 avec Voleur. 1 800 entrées aléatoires pour les validateurs (configuration, historique, paramètres) |
| `custom-roles` | 600 | Parties avec 1 à 3 rôles personnalisés aléatoires valides |

**Cas générés à l'intérieur d'un seul test**
- Fuzz du moteur lancé à **3 000 graines** (`FUZZ_SEEDS=3000`, 5 min 05) : 0 violation.
- La suite standard en lance 200.

**Bout en bout (Playwright, export web)**
- 15 tests réussis sur 15 ; 5 tests de captures ignorés (lancés seulement à la demande).
- Dont 4 nouveaux tests de robustesse : liens invalides, triple appui, rechargement en configuration, rechargement après une action.

**Monkey sur l'interface**
- 3 graines × 250 gestes (suite standard) et 6 graines × 500 gestes (101, 202, 303, 404, 505, 606).
- Total : 3 750 gestes, 122 à 170 contrôles distincts touchés par session, 0 erreur JavaScript.

**Bilan par mode (code final)**

| Suite | Mode développement | Mode production |
| --- | --- | --- |
| Jest, tests sans interface (moteur, stockage, campagne : 10 691 tests) | 10 689 réussis, 0 échec, 2 ignorés | 10 689 réussis, 0 échec, 2 ignorés (`NODE_ENV=production`) |
| Jest, tests d'interface (RNTL) | réussis, aucun avertissement React en console | **impossible** : React en production n'a pas `act`, nécessaire aux tests d'interface ; ces écrans sont couverts par les tests de bout en bout en production |
| Bout en bout, 15 scénarios | 15/15 sur le serveur Metro (`E2E_DEV=1`), aucune erreur de console tolérée | 15/15 sur l'export minifié |
| Captures d'écran, 5 parcours | — | 5/5 (captures de `docs/screenshots/web` régénérées) |
| Monkey | 3 graines × 250 gestes, en parallèle | 3 × 250, puis 6 × 500 gestes (graines 101 à 606), 0 erreur |
| iOS natif | build Debug compilée (EAS) | build Release compilée (EAS) ; bundle Hermes vérifié |

**Objectif de 15 000 :** non atteint en tests distincts.
- Exécutions réelles : 10 697 tests Jest réussis + 3 000 parties de fuzz + 15 scénarios de bout en bout + 9 sessions monkey ≈ 13 700 exécutions distinctes.
- Aller au-delà aurait demandé de dupliquer des graines sans gain de couverture.

**Couverture (Jest, instructions) :** 75,7 % au total (78,2 % des lignes).
- Moteur 92,3 %, stockage 91,1 %, état 83,0 %, illustrations 100 %.
- Composants 56,7 %, écrans 44,9 %, utilitaires 17,4 % : partage et fichiers natifs, non exécutables sous Jest.
- Les écrans sont surtout couverts par les tests de bout en bout et le monkey, dont la couverture n'est pas mesurée.

## 6. Build, iOS, sécurité, performance, accessibilité

**Build**
- `tsc --noEmit` : 0 erreur. `expo lint` : 0 erreur, 0 avertissement. `expo-doctor` : 20/20.
- `expo export -p ios` : bundle Hermes de 5,1 Mo, 2 013 modules.
- **EAS Build iOS**, projet `@aazerty12/loups-garous-mj`, sur Xcode 27.1 et le SDK iOS Simulator 27.1. Les deux builds ont été lancées avant les corrections A18 à A21, qui ne modifient que du JavaScript :
  - profil `development` (Debug, client de développement) : BUILD SUCCEEDED en 9 min ;
  - profil `simulator-release` (Release, ajouté à `eas.json`) : BUILD SUCCEEDED en 17 min ;
  - 0 erreur de compilation. Environ 2 700 avertissements, tous dans les en-têtes d'Expo, React Native et des dépendances (nullabilité Objective-C, etc.) : l'app n'a pas de code natif propre.
- **App Release inspectée** (93 Mo) :
  - `Info.plist` : identifiant `com.hugobsqtgames.loupsgarousmj`, version 1.0.0 (build 1), iOS 16.4 minimum, iPhone et iPad, 4 orientations, **aucune permission**, pas de mode arrière-plan, ATS strict (`NSAllowsArbitraryLoads: false`) ;
  - manifeste de confidentialité présent : aucun suivi, aucune donnée collectée, 4 API déclarées ;
  - `main.jsbundle` en bytecode Hermes (4,9 Mo) ; 15 sons, 6 polices et 20 images embarqués.
- **App de développement** : le JavaScript est chargé depuis Metro (normal). Elle demande en plus l'accès au réseau local, propre aux clients de développement, absent de la Release.
- **Non réalisé** : build signée pour appareil ou App Store (nécessite un compte Apple), exécution des apps (pas de simulateur).

**iOS (`app.json`)**
- Manifeste de confidentialité présent, `ITSAppUsesNonExemptEncryption: false`, aucune permission demandée (micro désactivé), pas de mode arrière-plan, iPad pris en charge, orientation libre.
- Clavier, zones sûres, VoiceOver, gestes, haptique, rotation : **non vérifiés sur iOS**.

**Sécurité et confidentialité**
- Aucun secret dans le dépôt ; aucun appel réseau ; aucun `eval` ni `innerHTML`.
- Les rôles personnalisés sont des données validées, jamais du code.
- `npm audit --omit=dev` : 5 alertes « élevées », toutes dans **l'outil en ligne de commande** `@expo/cli` (zod, node-forge), qui n'est pas embarqué dans l'application. Le correctif proposé par npm (`--force`) installerait Expo 44 : non appliqué.

**Performance (export web, Chromium)**
- Démarrage 0,78 s ; import 1,06 s ; ouverture d'une partie de 2 024 actions 1,21 s ; annulation 0,23 s ; tas JS 38 Mo.
- Aucune mesure sur iPhone.

**Accessibilité**
- Audit VoiceOver automatisé (`a11y.test.tsx`) : chaque contrôle a un rôle et un nom.
- Contraste vérifié par `themes.test.ts`.
- Cibles tactiles : boutons ≥ 44 pt ; segments portés à 46 pt.

## 7. Limites et actions humaines nécessaires

1. **Lancer une build de développement ou de production iOS** et faire les parcours critiques sur simulateur puis sur iPhone :
   - créer une partie, nuit, aube, vote, fin de partie ;
   - fermeture forcée en pleine partie, puis réouverture ;
   - export puis import d'une sauvegarde ;
   - partage de l'image récapitulative ;
   - feuille de note avec le clavier ouvert ;
   - VoiceOver et texte agrandi ;
   - rotation sur iPad.

   Les builds pour simulateur existent déjà (§ 6) : `npx eas-cli@latest build:list` pour les retrouver. Il faut un Mac pour les lancer, ou l'accès au simulateur EAS (liste d'attente : https://expo.dev/services/simulators). Pour un iPhone, il faut une build signée et donc un compte Apple.
2. **Paramètres :** si deux écritures se suivent et que la première échoue, l'annulation restaure la valeur d'avant la première. Cas rare, non corrigé.
3. **Brouillon de l'assistant :** enregistré 400 ms après la dernière saisie. Une fermeture forcée dans cet intervalle perd la dernière modification.
4. Les limites déjà connues restent valables (`docs/BUGS.md`).

## 8. Reproduire

```bash
npx tsc --noEmit && npx expo lint && npx expo-doctor
npx jest                                  # 10 699 tests (≈ 2 min 30 s)
npx jest src/__tests__/campaign           # campagne de l'audit seule
FUZZ_SEEDS=3000 npx jest src/engine/__tests__/fuzz.test.ts
npx jest --coverage
npx expo export -p web && npx playwright test          # mode production
E2E_DEV=1 npx playwright test                           # mode développement (serveur Metro)
NODE_ENV=production npx jest src/engine src/storage src/__tests__/campaign   # Jest, React production (hors interface)
MONKEY_SEED=101 MONKEY_STEPS=500 npx playwright test e2e/monkey.spec.ts
npx eas-cli@latest build --platform ios --profile simulator-release
npx expo export -p ios --output-dir /tmp/ios-export
```

Un échec de campagne indique sa graine dans le nom du test. Exemple : `npx jest -t "graine 42"`.

## 9. Niveau de confiance

- **Élevé** pour la logique de jeu, la persistance et l'intégrité des données : tests de propriétés, corruption et SQLite réel.
- **Moyen** pour l'interface : testée dans Chromium, pas sous UIKit.
- **Inconnu** pour tout ce qui est natif iOS.

Aucun audit ne garantit l'absence totale de défauts.
