# Règles, rôles et variantes

## Sources et honnêteté

Aucun livret officiel n’a pu être consulté directement pendant le développement. Les règles proviennent de résumés publics recoupés :

- **Jeu de base** (Ph. des Pallières & H. Marly) — résumé *regles-du-jeu.net* (déroulement, ordre de la nuit, Capitaine, égalités, Amoureux, victoires) ;
- **Nouvelle Lune** (2006) — cinq personnages confirmés par plusieurs fiches (Salvateur, Ancien, Bouc émissaire, Joueur de flûte, Idiot du village) ; détails : *sombrelune.fr*, *regles2jeux.fr* ;
- **Personnages** (2012) — *sombrelune.fr*, *loupgarou.fandom.com*, *github.com/Relex12/Loup-garou*.

Chaque rôle porte un **niveau de certitude** visible dans l’app :

- *Officielle* : règle de base confirmée ;
- *Probable* : sources tierces concordantes ;
- *Interprétation* : sources divergentes — le comportement retenu est documenté ci-dessous et, lorsqu’il influence le moteur, **configurable** dans les variantes.

Le maire de l’application correspond au **Capitaine** de la règle officielle.

## Rôles implémentés (30)

| Rôle | Camp | Origine | Ordre de nuit | Certitude | Pouvoir |
| --- | --- | --- | --- | --- | --- |
| Simple Villageois | Village | Jeu de base | — | Officielle | Aucun pouvoir particulier. |
| Loup-Garou | Loups-Garous | Jeu de base | 60 | Officielle | Les loups se réveillent ensemble et désignent une victime d’un commun accord. |
| Voyante | Village | Jeu de base | 55 | Officielle | Désigne un joueur ; le MJ lui montre sa carte. |
| Sorcière | Village | Jeu de base | 70 | Officielle | Apprend la victime des loups ; peut la sauver (potion de vie) et/ou empoisonner un joueur (potion de mort). |
| Chasseur | Village | Jeu de base | — | Officielle | À sa mort, désigne un joueur qui meurt aussitôt. |
| Cupidon | Village | Jeu de base | 30 | Officielle | Désigne deux joueurs (il peut se choisir) qui deviennent Amoureux. |
| Petite Fille | Village | Jeu de base | — | Officielle | Entrouvre les yeux pendant le tour des loups. Si elle est surprise, elle meurt à la place de la victime. |
| Voleur | Village | Jeu de base | 10 | Officielle | Regarde les deux cartes non distribuées et peut en prendre une ; il joue alors ce rôle. |
| Salvateur | Village | Nouvelle Lune | 50 | Probable | Désigne un joueur protégé des attaques nocturnes cette nuit. |
| Ancien | Village | Nouvelle Lune | — | Probable | Il faut deux attaques de loups pour le tuer. |
| Bouc émissaire | Village | Nouvelle Lune | — | Probable | Éliminé à la place des ex æquo ; il désigne alors qui pourra voter le lendemain. |
| Idiot du village | Village | Nouvelle Lune | — | Probable | S’il est désigné par le vote, il révèle sa carte et reste en vie. |
| Joueur de flûte | Solitaire | Nouvelle Lune | 80 | Probable | Chaque nuit, désigne deux joueurs qui deviennent charmés. |
| Corbeau | Village | Personnages | 90 | Probable | Désigne un joueur qui recevra des voix supplémentaires au prochain vote d’élimination. |
| Renard | Village | Personnages | 58 | Probable | Désigne un joueur : le MJ indique si lui ou l’un de ses deux voisins est un loup. |
| Montreur d’ours | Village | Personnages | — | Probable | À l’aube, le MJ grogne si un voisin vivant direct du Montreur est un loup. |
| Chevalier à l’épée rouillée | Village | Personnages | — | Interprétation | S’il est tué par les loups, le premier loup vivant à sa gauche meurt pendant la nuit suivante. |
| Deux Sœurs | Village | Personnages | 40 | Probable | Se réveillent la première nuit pour se reconnaître. |
| Trois Frères | Village | Personnages | 41 | Probable | Se réveillent la première nuit pour se reconnaître. |
| Enfant sauvage | Village | Personnages | 35 | Probable | La première nuit, désigne un modèle. À la mort du modèle, il rejoint la meute. |
| Chien-loup | Village | Personnages | 20 | Probable | Choisit définitivement son camp la première nuit. |
| Servante dévouée | Village | Personnages | — | Interprétation | Avant que la carte d’un joueur éliminé par le vote ne soit révélée, elle peut se dévoiler et prendre son rôle. |
| Juge bègue | Village | Personnages | — | Probable | Après un vote d’élimination, peut imposer un second vote sans débat le même jour. |
| Ange | Solitaire | Personnages | — | Interprétation | Victoire immédiate s’il meurt lors du premier vote (ou de la première nuit selon la variante). |
| Villageois-Villageois | Village | Personnages | — | Probable | Sa carte est identique des deux côtés : tout le monde sait qu’il est innocent. |
| Loup-Garou blanc | Solitaire | Personnages | 64 | Probable | Se réveille avec les loups ; les nuits paires, se réveille seul et peut tuer un loup. |
| Grand Méchant Loup | Loups-Garous | Personnages | 66 | Probable | Après la meute, se réveille seul et dévore une victime supplémentaire. |
| Infect Père des Loups | Loups-Garous | Personnages | 62 | Probable | Après le choix de la meute, peut infecter la victime au lieu de la tuer : elle rejoint les loups. |
| Abominable sectaire | Solitaire | Personnages | — | Probable | Le MJ partage le village en deux groupes ; le Sectaire gagne si tous les joueurs de l’autre groupe sont morts. |
| Comédien | Village | Personnages | 15 | Interprétation | Choisit une carte disponible et utilise son pouvoir pour la nuit ; la carte est ensuite retirée. |

### Points non confirmés

- **Voyante** : Ce que voit la Voyante d’un joueur infecté n’est pas précisé : l’app affiche sa carte et signale l’infection au MJ.
- **Sorcière** : Auto-guérison : variante configurable (autorisée par défaut).
- **Cupidon** : Victoire de Cupidon avec un couple mixte : variante configurable (désactivée par défaut).
- **Salvateur** : Auto-protection et interdiction de répéter : variantes configurables (autorisées / actives par défaut).
- **Ancien** : Sources de la vengeance (vote seul ou vote/Chasseur/Sorcière) : variante configurable.
- **Bouc émissaire** : Priorité par rapport au maire non confirmée : configurable.
- **Idiot du village** : Second vote contre un Idiot révélé : il meurt (variante configurable).
- **Corbeau** : Nombre de voix ajoutées : 2 par défaut (configurable).
- **Montreur d’ours** : Comportement de l’ours si le Montreur est infecté : grogne toujours (interprétation).
- **Chevalier à l’épée rouillée** : Les sources divergent sur le côté (gauche/droite) : l’app utilise la gauche = place suivante.
- **Chevalier à l’épée rouillée** : Selon certaines sources, les loups ne font pas de victime la nuit suivante : non appliqué.
- **Deux Sœurs** : Réveils ultérieurs facultatifs non gérés par l’app.
- **Trois Frères** : Réveils ultérieurs facultatifs non gérés par l’app.
- **Enfant sauvage** : Toute mort du modèle ou seulement par les loups : variante configurable (toute mort par défaut).
- **Servante dévouée** : Les sources diffèrent sur l’état des pouvoirs repris : l’app les remet à neuf.
- **Ange** : Fenêtre de victoire (premier vote seul ou premier tour complet) : configurable.
- **Grand Méchant Loup** : « Loup éliminé » interprété comme : tout joueur mort alors qu’il était dans le camp des loups.
- **Abominable sectaire** : Doit-il être vivant pour gagner ? L’app l’exige.
- **Comédien** : Les cartes admises varient selon les sources : liste limitée aux pouvoirs nocturnes simples.

**Non implémentés** : la Gitane (pouvoir variable selon les sources), les cartes Événement de *Nouvelle Lune*, les bâtiments du *Village*, les rôles du *Pacte*. Les réveils ultérieurs facultatifs des Deux Sœurs / Trois Frères ne sont pas guidés.

## Ordre de la nuit

Voleur (10, nuit 1) → Comédien (15) → Chien-loup (20, nuit 1) → Cupidon (30, nuit 1) → Amoureux (31) → Enfant sauvage (35, nuit 1) → Deux Sœurs / Trois Frères (40–41, nuit 1) → Salvateur (50) → Voyante (55) → Renard (58) → **Loups-Garous (60)** → Infect Père des Loups (62) → Loup-Garou blanc (64, nuits paires) → Grand Méchant Loup (66) → **Sorcière (70)** → Joueur de flûte (80) → Charmés (81) → Corbeau (90). Les rôles personnalisés s’insèrent selon leur « ordre de réveil » (0–100). Le Montreur d’ours agit à l’aube.

La liste est **recalculée après chaque choix** : si le Voleur prend une carte de loup, il rejoint immédiatement l’étape des loups ; si Cupidon désigne les Amoureux, leur étape apparaît. Corriger une étape antérieure retire les choix ultérieurs devenus invalides (ils sont à refaire).

Variante *Appeler les rôles absents* (active par défaut) : les rôles morts, hors jeu ou privés de pouvoir restent appelés « pour la forme ».

## Résolution de l’aube (ordre)

1. Mort différée de l’épée rouillée (non bloquable).
2. Protections : Salvateur et rôles personnalisés « protéger ».
3. Informations : Voyante, Renard (perte du flair si aucun loup dans le groupe), actions personnalisées.
4. Infection (la victime rejoint les loups, n’est pas tuée ; impossible si protégée) ou attaque de la meute (ou de la Petite Fille surprise) ; attaques du Grand Méchant Loup, du Loup blanc, des tueurs personnalisés.
5. Potions : la potion de vie annule les attaques de loups sur la cible ; la potion de mort tue (ignore protection et Ancien).
6. Une attaque non bloquée contre l’Ancien consomme sa vie supplémentaire.
7. Charmes, marque du Corbeau, fin des emprunts du Comédien.
8. Morts en chaîne, puis ours du Montreur (voisins vivants après les morts).

## Morts en chaîne

À chaque mort : Amoureux (mort de chagrin), Chasseur (décision « tir », sauf pouvoirs perdus), maire (succession ou nouvelle élection), Ancien tué par le village (perte des pouvoirs du village), Chevalier dévoré (premier loup à sa gauche meurt la nuit suivante), Enfant sauvage (devient loup), Ange (victoire dans sa fenêtre). Un joueur ne meurt jamais deux fois ; une garde empêche toute boucle infinie.

## Maire et votes

- **Élection** (premier jour, variante activable) : candidatures facultatives (sans candidature, tous les vivants sont éligibles), égalité → second tour puis départage du MJ (variantes : MJ directement, ou pas de maire).
- **Vote d’élimination** : une voix par votant ; le mode *compteur* ajoute/retire des voix anonymes (limitées au nombre de votants) et saisit à part le vote du maire ; le mode *nominatif* associe chaque votant à sa cible (un nouveau choix remplace l’ancien). Compteur de voix reçues et vote émis sont modélisés séparément ; chaque opération est conservée dans le scrutin.
- **Interdits** : voter contre un mort, un non-candidat, ou (mode nominatif) contre son Amoureux ; un mort ou un Idiot révélé ne vote pas.
- **Égalité** (règle de base) : le maire tranche ; sans maire, second vote entre ex æquo ; si l’égalité persiste, personne n’est éliminé. Le Bouc émissaire vivant est prioritaire (variante). Variantes : toujours un second vote, ou personne.
- **Après validation** : Idiot (révélé, épargné), Servante dévouée (peut prendre le rôle), puis mort et conséquences. Le Juge bègue peut imposer un second vote une fois par partie.
- Voix du maire ×2 (variante : ×1), Corbeau +2 voix (configurable 1–3) au premier vote du lendemain.

## Conditions de victoire

Évaluées seulement lorsqu’aucune décision n’est en attente, jamais pendant la nuit : Ange (éliminé dans sa fenêtre) ; Joueur de flûte (tous les survivants charmés) ; Sectaire (groupe opposé éliminé) ; Loup blanc seul survivant ; couple mixte seul survivant (+ Cupidon en variante) ; personne en vie ; uniquement des loups (hors Loup blanc) ; plus aucun loup ni solitaire. La victoire bloque les actions suivantes jusqu’à « Terminer la partie » ou une correction de l’historique.

## Variantes

Toutes visibles dans *Paramètres › Variantes par défaut* et modifiables partie par partie : élection du maire, poids du vote du maire, égalités (maire / élimination), succession, Bouc émissaire prioritaire, mode de saisie, votes blancs, limite au nombre de votants, appels pour la forme, auto-protection et non-répétition du Salvateur, auto-guérison de la Sorcière, vengeance de l’Ancien, fenêtre et début de partie de l’Ange, transformation de l’Enfant sauvage, victoire de Cupidon, Servante, Idiot révélé, bonus du Corbeau. Les combinaisons sans effet ou incohérentes sont signalées.

## Composition automatique

1. Loups selon la table (8–18 joueurs officiels, étendue) : 5–6 → 1, 7–11 → 2, 12–17 → 3, 18–23 → 4, 24–29 → 5, 30+ → 6.
2. La Voyante est toujours incluse.
3. Rôles spéciaux tirés par paliers de priorité (graine reproductible) selon les extensions et la complexité (découverte, équilibrée, riche), jusqu’à un quota.
4. Chaque ajout qui ferait sortir l’indice d’équilibre de ±max(3, n/3) est refusé (indice = somme de poids **heuristiques** documentés dans le catalogue, positifs pour le village).
5. Complément en Simples Villageois, puis passe de rééquilibrage.

Chaque décision est expliquée dans l’écran. L’indice est une aide, pas une vérité mathématique.

## Ajouter un rôle intégré

1. Ajouter l’identifiant dans `BuiltinRoleId` (`src/engine/types.ts`) et sa fiche dans `roles/catalog.ts` (camp, textes, sources, certitude, `nightOrder`, `nightStep`, `maxCopies`, `balance`).
2. S’il se réveille : ajouter un `StepKind`, l’étape dans `night/steps.ts`, la validation dans `night/choices.ts`, l’effet dans `night/resolve.ts`, le formulaire dans `src/screens/game/night/step-form.tsx` et la phrase dans `scripts.ts`.
3. S’il a un effet à la mort : `deaths.ts` ; s’il gagne seul : `victory.ts`.
4. Ajouter des scénarios dans `src/engine/__tests__/roles.test.ts` et relancer le fuzzing.

## Ajouter une variante

1. Champ dans `Variants` + valeur par défaut dans `DEFAULT_VARIANTS` + entrée dans `VARIANT_OPTIONS` (libellé, aide, officiel ou non, choix) ; incohérences dans `checkVariants`.
2. Lire la variante dans le module concerné du moteur ; ajouter un test pour chaque valeur.
3. Les parties existantes reçoivent la valeur par défaut au chargement (`normalizeVariants`).

## Rôles personnalisés

Définis uniquement par des choix fermés : camp, action nocturne (aucune, découvrir, protéger, éliminer, marquer), fréquence, utilisations, auto-ciblage, effet à la mort (aucun ou tir), ordre de réveil. Ils sont validés à l’enregistrement et à l’import ; **aucun code n’est jamais exécuté**. Limite : un solitaire personnalisé n’a pas de condition de victoire propre (il empêche seulement les autres camps de gagner tant qu’il vit).
