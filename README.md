# Loups-Garous MJ

Application iPhone pour le **maître du jeu** des *Loups-garous de Thiercelieux* (et extensions *Nouvelle Lune* / *Personnages*). Les joueurs gardent leurs cartes physiques ; le MJ prépare la partie, est guidé pas à pas pendant les nuits, tranche les votes, et l’application applique les règles, enregistre tout et permet de corriger chaque erreur.

- **100 % hors ligne** : aucun compte, aucun serveur, aucune publicité, aucun achat intégré, aucune télémétrie.
- Données stockées localement (SQLite), sauvegarde automatique après chaque action, reprise après fermeture.
- Expo SDK 58 · React Native 0.88 · TypeScript strict · Expo Router.

<p>
<img src="docs/screenshots/web/31-accueil-favoris.png" width="200" alt="Accueil" />
<img src="docs/screenshots/web/10-nuit-voyante-resultat.png" width="200" alt="Nuit : Voyante" />
<img src="docs/screenshots/web/19-vote-compteurs.png" width="200" alt="Vote d’élimination" />
<img src="docs/screenshots/web/14-aube-bilan.png" width="200" alt="Bilan de l’aube" />
</p>

> Captures **réelles** de l’application, exécutée via son export web dans Chromium (format iPhone 390 × 844). Aucune capture iOS native n’a pu être produite dans l’environnement de développement (Linux, sans simulateur) — voir [docs/TEST_REPORT.md](docs/TEST_REPORT.md).

## Fonctionnalités

| Domaine | Contenu |
| --- | --- |
| Création de partie | joueurs (ordre des places, doublons refusés), cartes à la main ou composition automatique expliquée, tirage par l’app ou saisie des cartes reçues, cartes hors jeu (Voleur, Comédien), groupes du Sectaire, variantes, compositions favorites |
| Nuit | guide pas à pas dans l’ordre officiel, phrase à prononcer, joueurs concernés masquables, résultat Voyante/Renard, appels « pour la forme » des rôles absents, correction d’une étape validée, narration vocale optionnelle |
| Aube | annonce publique séparée du détail MJ, ours du Montreur, décisions bloquantes (Chasseur, succession du maire, Servante, Bouc émissaire…) |
| Votes | élection du maire (candidatures, second tour, départage), vote d’élimination en mode compteur (+/−) ou nominatif, vote du maire ×2, Corbeau, votes blancs/abstentions, égalités selon variantes, réouverture avant validation, annulation de la dernière opération |
| Rôles | 30 rôles intégrés avec sources et niveau de certitude, rôles personnalisés déclaratifs (aucun code exécuté) |
| Historique | journal chronologique, annulation, retour à n’importe quel point, correction de la cible d’une action passée avec recalcul complet |
| Après la partie | résumé, rôles révélés, moments clés, rejouer la même composition, statistiques locales |
| Réglages | 4 thèmes + mode discret, volumes ambiance/effets/narration, mode silencieux, masquage des rôles, haptique, écran allumé, variantes par défaut, export/import JSON, effacement contrôlé |

## Prérequis et lancement

- Node.js 22 (testé avec 22.22), npm 10.
- Pour iOS : un Mac avec Xcode, ou EAS Build (`npx eas-cli build -p ios`). Les modules natifs utilisés (expo-sqlite, expo-audio, expo-speech…) nécessitent une *development build* (`npx expo run:ios`), pas Expo Go seul.

```bash
npm install
npx expo run:ios          # build de développement sur simulateur / iPhone (macOS)
npm run web               # version web de développement (http://localhost:8081)
```

## Qualité et tests

```bash
npm run typecheck         # TypeScript strict
npm run lint              # ESLint (config Expo)
npm test                  # Jest : moteur, persistance, audio, état, intégration UI (149 tests)
npm run test:coverage
FUZZ_SEEDS=2000 npx jest src/engine/__tests__/fuzz.test.ts   # fuzzing prolongé
npm run build:web && npx playwright test                     # E2E (Chromium sur l’export web)
MONKEY_SEED=23 MONKEY_STEPS=1000 npx playwright test e2e/monkey.spec.ts
SCREENSHOTS=1 npx playwright test e2e/screenshots.spec.ts    # régénère docs/screenshots/web
npx expo-doctor
```

Régénérer les ressources : `npm run generate:audio` (sons de synthèse), `node scripts/generate-icons.mjs` (icônes), `node scripts/render-mockups.mjs` (maquettes).

## Documentation

- [Architecture et décisions techniques](docs/ARCHITECTURE.md)
- [Règles, rôles, variantes, ajout d’un rôle ou d’une variante](docs/RULES.md)
- [Rapport de tests](docs/TEST_REPORT.md)
- [Bugs corrigés et problèmes ouverts](docs/BUGS.md)
- [Maquettes et comparaison avec l’application](docs/mockups/COMPARAISON.md)
- [Étapes avant publication sur l’App Store](docs/STORE_CHECKLIST.md)

## Structure

```
src/
  app/            routes Expo Router (fichiers fins qui rendent un écran)
  screens/        écrans (accueil, création, jeu, rôles, réglages…)
  components/     composants d’interface réutilisables
  engine/         moteur de règles pur TypeScript (aucune dépendance UI)
  storage/        SQLite : pilote, migrations, dépôt, validation
  state/          stores (zustand), brouillon, sauvegarde automatique, statistiques
  audio/          gestionnaire audio, sons, narration
  theme/          jetons de conception, thèmes, contrastes
  settings/       modèle et validation des paramètres
e2e/              tests Playwright
scripts/          générateurs (sons, icônes, maquettes), serveur web local
docs/             documentation, maquettes, captures
```
