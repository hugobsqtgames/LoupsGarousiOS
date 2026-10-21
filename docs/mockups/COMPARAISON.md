# Maquettes et comparaison avec l’application réelle

- **Maquettes** : `board.html` (HTML/CSS statique, jetons du thème « Clair de lune »), rendues en PNG par `node scripts/render-mockups.mjs` → `board.png` (planche) et `screens/*.png` (12 écrans).
- **Captures réelles** : `../screenshots/web/*.png` — application exécutée (export web) dans Chromium, viewport iPhone 390 × 844 @2x. Ce ne sont pas des captures iOS natives.
- **Comparaisons** : `comparaison/*.png` (maquette à gauche, réel à droite), générées par `python3 scripts/compare-mockups.py`.

> Chronologie honnête : la direction artistique a d’abord été fixée dans le code (jetons de couleur, typographies, composants), puis les maquettes ont été réalisées pour les 12 écrans demandés et comparées au produit. Les maquettes n’utilisent pas les polices Cinzel/Inter (repli sur les polices système), d’où des titres légèrement différents.

| Écran | Maquette | Réel | Écarts constatés |
| --- | --- | --- | --- |
| Accueil | `screens/01-accueil.png` | `31-accueil-favoris.png` | conforme (carte de reprise, favoris, grimoire) |
| Création — joueurs | `02` | `02-creation-joueurs.png` | conforme |
| Composition | `03` | `03-creation-composition-auto.png` | conforme ; le réel ajoute les extensions et l’option solitaire |
| Liste des joueurs | `04` | `15-tableau-de-bord-jour.png` | conforme ; le réel ajoute l’indicateur de sauvegarde |
| Nuit | `05` | `10-nuit-voyante-resultat.png` | conforme |
| Résolution | `06` | `13-nuit-recapitulatif.png` | conforme |
| Élection du maire | `07` | `17-maire-scrutin.png` | conforme |
| Vote d’élimination | `08` | `19-vote-compteurs.png` | **écart corrigé** : le compteur général sortait de l’écran avec 10 joueurs ; ajout d’un résumé fixe au-dessus de « Clôturer » |
| Aube | `09` | `14-aube-bilan.png` | conforme ; la décision du Chasseur apparaît dès qu’elle existe |
| Fiche joueur | `10` | `21-fiche-joueur.png` | conforme |
| Catalogue | `11` | `33-catalogue-roles.png` | **écart corrigé** : libellés de filtres coupés sur deux lignes |
| Paramètres | `12` | `28-parametres.png`, `29-parametres-audio.png` | conforme ; audio sur un second écran défilé |

Autres corrections issues de la revue des captures : décor de forêt qui chevauchait le texte, libellés tronqués dans l’éditeur de rôle, appui sur une ligne joueur intercepté par le texte masqué (voir `../BUGS.md`).
