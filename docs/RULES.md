# Règles, rôles et variantes

## Sources

Les règles ont été vérifiées dans les **livrets officiels** (lus en octobre 2026, fichiers publics de la plateforme *1jour-1jeu*) :

| Livret | Édition consultée | Contenu vérifié |
| --- | --- | --- |
| Jeu de base *Les Loups-Garous de Thiercelieux* | française, 2014 (lui-même) | déroulement, Voleur (deux cartes ajoutées au paquet), Petite Fille, Sorcière (auto-guérison), Capitaine, **égalités** (le Capitaine tranche, sinon second vote, sinon personne), victoires |
| *Best Of* | traduction anglaise, 2017 | Infect (l’Ancien n’est pas affecté ; la potion ne guérit pas l’infection), Ancien (vote, poison, Chasseur), Ange (vote, loups ou poison au premier tour), Grand Méchant Loup, Chevalier, Renard, Montreur d’ours, ordre d’appel |
| Extension *Nouvelle Lune* | anglaise, 2015 | Salvateur (auto-protection autorisée, jamais deux nuits de suite, sans effet sur la Petite Fille), Ancien, Bouc émissaire, Joueur de flûte, Idiot (s’il était Capitaine, le titre est perdu), 9 variantes dont *Nouvelle Lune* (36 cartes Événement) et la carte Spiritisme |
| Extension *Le Village* | française, 2009 | Corbeau (+2 voix, en dernier), Loup-Garou blanc |
| Extension *Personnages* | anglaise, 2013 | 16 personnages + **Gitane** et Crieur (bonus), précisions détaillées sur la Servante dévouée, ordre d’appel |

Liste des 36 cartes Événement : transcription anglaise du livret et des cartes (*graysbluemoon.blogspot.com*, 2010) recoupée avec des noms français attestés (forum *rpgthiercelieux*). **Les textes des cartes ne sont pas reproduits** : l’application en donne un résumé rédigé pour elle ; le MJ lit la carte physique.

Chaque rôle porte un **niveau de certitude** visible dans l’app :

- *Officielle* : vérifiée dans un livret officiel ;
- *Probable* : sources tierces concordantes ;
- *Interprétation* : le livret est muet ou ambigu — le choix retenu est documenté ci-dessous et, lorsqu’il influence le moteur, **configurable**.

Le maire de l’application correspond au **Capitaine** de la règle officielle.

### Ce qui a changé après la lecture des livrets

| Point | Avant | Maintenant (livret) |
| --- | --- | --- |
| Salvateur et Petite Fille surprise | protégée | **non protégée** (Nouvelle Lune) |
| Infection de l’Ancien | infecté | **aucun effet** : l’attaque reste normale, l’Infect garde son pouvoir (interprétation de « non affecté ») |
| Chevalier dévoré par le Grand Méchant Loup | premier loup à gauche | premier **des loups responsables** (le Grand Méchant Loup) |
| Idiot révélé qui était maire | restait maire | **poste de maire perdu définitivement** |
| Servante dévouée | rôle remis à neuf | idem, **joué « comme une première nuit »** (nouveau modèle, choix de camp, nouveau couple si aucun n’est vivant…) ; charme et titre de maire de la Servante perdus (elle désigne un successeur) ; infection conservée ; l’Ange repris ne gagne pas |
| Ange amoureux | pouvait gagner | **renonce** à son objectif |
| Corbeau | extension *Personnages* | extension **Le Village** |
| Voleur (tirage par l’app) | deux cartes choisies, toujours au centre | **règle officielle** : deux cartes ajoutées au paquet, mélange, les deux restantes vont au centre |
| Gitane, cartes Événement | non implémentées | **implémentées** |
| Juge bègue, Montreur d’ours | — | appel de la première nuit (signe convenu, repérage) |

Les parties enregistrées avant cette mise à jour sont rejouées avec les règles actuelles ; si une action devient impossible, l’application le signale au chargement (mécanisme existant de détection).

## Rôles implémentés (31)

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
| Salvateur | Village | Nouvelle Lune | 50 | Officielle | Désigne un joueur protégé des attaques nocturnes cette nuit. |
| Ancien | Village | Nouvelle Lune | — | Officielle | Il faut deux attaques de loups pour le tuer. |
| Bouc émissaire | Village | Nouvelle Lune | — | Officielle | Éliminé à la place des ex æquo ; il désigne alors qui pourra voter le lendemain. |
| Idiot du village | Village | Nouvelle Lune | — | Officielle | S’il est désigné par le vote, il révèle sa carte et reste en vie. |
| Joueur de flûte | Solitaire | Nouvelle Lune | 80 | Officielle | Chaque nuit, désigne deux joueurs qui deviennent charmés. |
| Corbeau | Village | Le Village | 90 | Officielle | Désigne un joueur qui recevra des voix supplémentaires au prochain vote d’élimination. |
| Renard | Village | Personnages | 58 | Officielle | Désigne un joueur : le MJ indique si lui ou l’un de ses deux voisins est un loup. |
| Montreur d’ours | Village | Personnages | — | Officielle | À l’aube, le MJ grogne si un voisin vivant direct du Montreur est un loup. |
| Chevalier à l’épée rouillée | Village | Personnages | — | Officielle | S’il est dévoré, le premier des loups responsables assis à sa gauche meurt pendant la nuit suivante ; sa mort est annoncée au matin. |
| Deux Sœurs | Village | Personnages | 40 | Officielle | Se réveillent la première nuit pour se reconnaître. |
| Trois Frères | Village | Personnages | 41 | Officielle | Se réveillent la première nuit pour se reconnaître. |
| Enfant sauvage | Village | Personnages | 44 | Officielle | La première nuit, désigne un modèle. À la mort du modèle, il rejoint la meute. |
| Chien-loup | Village | Personnages | 20 | Officielle | Choisit définitivement son camp la première nuit. |
| Servante dévouée | Village | Personnages | — | Officielle | Avant que la carte d’un joueur éliminé par le vote ne soit révélée, elle peut se dévoiler et prendre son rôle. |
| Juge bègue | Village | Personnages | — | Officielle | Après un vote d’élimination, peut imposer un second vote sans débat le même jour. |
| Ange | Solitaire | Personnages | — | Officielle | Victoire immédiate s’il est éliminé au premier tour : vote du premier jour, loups ou potion de mort de la première nuit. |
| Villageois-Villageois | Village | Personnages | — | Officielle | Sa carte est identique des deux côtés : tout le monde sait qu’il est innocent. |
| Loup-Garou blanc | Solitaire | Personnages | 64 | Officielle | Se réveille avec les loups ; une nuit sur deux, se réveille seul et peut tuer un loup. |
| Grand Méchant Loup | Loups-Garous | Personnages | 66 | Officielle | Après la meute, se réveille seul et dévore une victime supplémentaire. |
| Infect Père des Loups | Loups-Garous | Personnages | 62 | Officielle | Après le choix de la meute, peut infecter la victime au lieu de la tuer : elle rejoint les loups. |
| Abominable sectaire | Solitaire | Personnages | — | Officielle | Le MJ partage le village en deux groupes ; le Sectaire gagne si tous les joueurs de l’autre groupe sont morts. |
| Comédien | Village | Personnages | 15 | Officielle | Chaque nuit, peut choisir l’une des trois cartes à pouvoir mises de côté et utiliser ce pouvoir jusqu’à la nuit suivante ; la carte est ensuite retirée. |
| Gitane | Village | Personnages | 72 | Officielle | Le MJ lit les quatre questions d’une carte Spiritisme ; la Gitane en choisit une et désigne le joueur qui la posera au matin. Le premier éliminé répond par oui ou par non. |

### Points que les livrets ne tranchent pas

- **Voyante** : Ce que voit la Voyante d’un joueur infecté n’est pas précisé : l’app affiche sa carte et signale l’infection au MJ.
- **Cupidon** : Cupidon gagne-t-il avec un couple mixte ? Non précisé : variante désactivée par défaut.
- **Ancien** : « Guéri par la Sorcière, il ne retrouve qu’une seule vie » : formulation ambiguë ; l’app considère que l’attaque soignée ne lui coûte pas de vie.
- **Bouc émissaire** : Priorité par rapport au maire non précisée par les livrets : configurable (Bouc émissaire prioritaire par défaut).
- **Idiot du village** : Second vote contre un Idiot déjà révélé : non précisé ; il meurt par défaut (configurable).
- **Chevalier à l’épée rouillée** : « Gauche » = place suivante dans l’ordre saisi : saisissez les joueurs dans le sens des aiguilles d’une montre.
- **Chevalier à l’épée rouillée** : Dévoré par le Grand Méchant Loup seul : seul ce loup est responsable (interprétation).
- **Deux Sœurs** : Réveils ultérieurs « de temps en temps » : variante (une nuit sur deux) désactivée par défaut.
- **Trois Frères** : Réveils ultérieurs « de temps en temps » : variante (une nuit sur deux) désactivée par défaut.
- **Servante dévouée** : Reprise de Cupidon alors qu’un couple vit encore (deux couples possibles selon le livret) : non géré, l’app ne propose pas de nouveau couple.
- **Loup-Garou blanc** : « Une nuit sur deux » : nuits paires par défaut (configurable).
- **Grand Méchant Loup** : Les livrets divergent : « aucun autre loup éliminé » (Best Of, par défaut) ou « aucun loup, Enfant sauvage ou Chien-loup éliminé » (Personnages) : configurable.
- **Abominable sectaire** : Doit-il être vivant pour gagner ? L’app l’exige.
- **Comédien** : Le livret autorise toute carte à pouvoir sauf les loups ; l’app se limite aux pouvoirs qu’elle sait appliquer.
- **Gitane** : Le texte des questions est celui des cartes physiques : l’app ne le reproduit pas.


## Gitane

À chaque nuit (après la Sorcière), si elle le souhaite : le MJ lit les quatre questions d’une carte Spiritisme (cinq cartes, chacune utilisable une fois), la Gitane en choisit une et désigne le joueur qui la posera. Au matin, l’application rappelle qui pose la question et **qui répond (le premier joueur éliminé)**. Interprétation : si personne n’est encore éliminé, la question reste sans réponse. Les cartes Spiritisme sont alors retirées de la pioche des événements.

## Cartes Événement (variante *Nouvelle Lune*)

Chaque matin **sauf le premier**, le dernier joueur éliminé lit une carte (le livret conseille un matin sur deux ou trois pour débuter : réglable). Le MJ tire au hasard dans l’app ou indique la carte physique tirée. Chaque carte n’est tirée qu’une fois. L’application :

- **applique elle-même** : Retour de flamme (nuit suivante), Bourreau et Ensevelissement (rôles masqués dans l’annonce), Pile ou face et Pacte avec le diable (« Gracier » à la validation du vote), Spiritisme (Spirite = joueur vivant à gauche du dernier éliminé ; réponse du premier éliminé — le texte de la carte parle de la première victime des loups : les deux sont indiqués s’ils diffèrent) ;
- **guide** les autres cartes : rappel au bon moment (étape de nuit, vote) et **outils du MJ** (vote supplémentaire, retour en jeu, changement de camp, potion rendue, destitution du maire, élimination manuelle), tous tracés dans l’historique et annulables.

La catégorie d’effet (immédiat, différé, permanent) est **déduite du texte** : le symbole imprimé sur la carte n’a pas pu être vérifié.

| N° | Carte | Nom | Effet | Durée de rappel | Application |
| --- | --- | --- | --- | --- | --- |
| 1 | Somnambulisme | traduit | Effet permanent (nouvelle lune) | permanent | rappel |
| 2 | Contact mortel | traduit | Effet permanent (nouvelle lune) | permanent | rappel |
| 3 | Le Bourreau | traduit | Effet permanent (nouvelle lune) | permanent | automatique : hide-vote-roles |
| 4 | Ensevelissement | attesté | Effet permanent (nouvelle lune) | permanent | automatique : hide-wolf-victim-roles |
| 5 | Agent double | traduit | Effet immédiat (pleine lune) | day-and-night | outils : set-team |
| 6 | Le Petiot | attesté | Effet différé (croissant de lune) | day-and-night | rappel |
| 7 | Retour de flamme | traduit | Effet différé (croissant de lune) | next-night | automatique : backfire |
| 8 | Mécontentement | attesté | Effet différé (croissant de lune) | next-vote | outils : extra-vote |
| 9 | Influences | traduit | Effet différé (croissant de lune) | next-vote | rappel |
| 10 | Lever de pleine lune | traduit | Effet différé (croissant de lune) | next-night | outils : eliminate |
| 11 | Enthousiasme | attesté | Effet différé (croissant de lune) | next-vote | outils : extra-vote |
| 12 | Le Spectre | traduit | Effet différé (croissant de lune) | next-night | outils : revive, set-team, eliminate |
| 13 | Miracle | traduit | Effet immédiat (pleine lune) | day | outils : revive |
| 14 | Bonnes manières | attesté | Effet immédiat (pleine lune) | day | rappel |
| 15 | Saint Philippe | traduit | Effet immédiat (pleine lune) | day | outils : remove-mayor |
| 16 | Pile ou face | attesté | Effet immédiat (pleine lune) | day | automatique : spare |
| 17 | La cueillette | traduit | Effet immédiat (pleine lune) | day | outils : grant-use |
| 18 | Dimanche radieux | traduit | Effet immédiat (pleine lune) | day | rappel |
| 19 | Bal du samedi soir | attesté | Effet immédiat (pleine lune) | day-and-night | rappel |
| 20 | Éclipse | traduit | Effet immédiat (pleine lune) | day | rappel |
| 21 | Pacte avec le diable | traduit | Effet immédiat (pleine lune) | day | automatique : spare |
| 22 | Déluge | attesté | Effet immédiat (pleine lune) | day-and-night | outils : eliminate |
| 23 | Poisson d’avril | traduit | Effet immédiat (pleine lune) | day-and-night | outils : revive, eliminate |
| 24 | Fin des moissons | traduit | Effet immédiat (pleine lune) | day | rappel |
| 25 | Grande méfiance | attesté | Effet immédiat (pleine lune) | day | outils : eliminate |
| 26 | Repas des anciens | attesté | Effet immédiat (pleine lune) | day | rappel |
| 27 | Châtiment | traduit | Effet immédiat (pleine lune) | day | outils : eliminate |
| 28 | Partie de chasse | traduit | Effet immédiat (pleine lune) | day-and-night | rappel |
| 29 | Ni moi, ni loup | attesté | Effet immédiat (pleine lune) | day | rappel |
| 30 | Lundi morose | traduit | Effet immédiat (pleine lune) | day | rappel |
| 31 | Cauchemar | traduit | Effet immédiat (pleine lune) | day | outils : extra-vote |
| 32 | Spiritisme n° 1 | attesté | Effet immédiat (pleine lune) | day | automatique : spiritualism |
| 33 | Spiritisme n° 2 | attesté | Effet immédiat (pleine lune) | day | automatique : spiritualism |
| 34 | Spiritisme n° 3 | attesté | Effet immédiat (pleine lune) | day | automatique : spiritualism |
| 35 | Spiritisme n° 4 | attesté | Effet immédiat (pleine lune) | day | automatique : spiritualism |
| 36 | Spiritisme n° 5 | attesté | Effet immédiat (pleine lune) | day | automatique : spiritualism |

## Ordre de la nuit

Voleur (10, nuit 1) → Comédien (15) → Chien-loup (20, nuit 1) → Cupidon (30, nuit 1) → Amoureux (31) → Juge bègue (33, nuit 1, signe) → Deux Sœurs / Trois Frères (40–41, nuit 1 ; une nuit sur deux en variante) → Enfant sauvage (44, nuit 1) → Montreur d’ours (46, nuit 1, repérage) → Salvateur (50) → Voyante (55) → Renard (58) → **Loups-Garous (60)** → Infect Père des Loups (62) → Loup-Garou blanc (64, une nuit sur deux) → Grand Méchant Loup (66) → **Sorcière (70)** → Gitane (72) → Joueur de flûte (80) → Charmés (81) → Corbeau (90). Les rôles repris par la Servante dévouée rejouent leurs appels de première nuit la nuit suivante. Les rôles personnalisés s’insèrent selon leur « ordre de réveil » (0–100). Le Montreur d’ours agit à l’aube.

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
- **Mains levées** (mode compteur) : le MJ saisit directement le nombre de mains pour un joueur ; l’application l’enregistre en opérations +1/−1 unitaires (historique, annulation et plafond de votants conservés).
- Un Idiot révélé qui était maire fait perdre le poste de maire pour le reste de la partie.
- Événements *Pile ou face* / *Pacte avec le diable* : le condamné peut être gracié ; le vote du jour compte comme effectué.

## Conditions de victoire

Évaluées seulement lorsqu’aucune décision n’est en attente, jamais pendant la nuit : Ange (éliminé dans sa fenêtre) ; Joueur de flûte (tous les survivants charmés) ; Sectaire (groupe opposé éliminé) ; Loup blanc seul survivant ; couple mixte seul survivant (+ Cupidon en variante) ; rôles personnalisés solitaires (voir plus bas) ; personne en vie ; uniquement des loups (hors Loup blanc) ; plus aucun loup ni solitaire. La victoire bloque les actions suivantes jusqu’à « Terminer la partie » ou une correction de l’historique.

## Variantes

Toutes visibles dans *Paramètres › Variantes par défaut* et modifiables partie par partie : élection du maire, poids du vote du maire, égalités (maire / élimination), succession, Bouc émissaire prioritaire, mode de saisie, votes blancs, limite au nombre de votants, appels pour la forme, auto-protection et non-répétition du Salvateur, auto-guérison de la Sorcière, vengeance de l’Ancien, fenêtre et début de partie de l’Ange, transformation de l’Enfant sauvage, victoire de Cupidon, Servante, Idiot révélé, bonus du Corbeau, règle du Grand Méchant Loup (*Best Of* ou *Personnages*), nuits du Loup blanc (paires/impaires), réveils facultatifs des Sœurs et Frères, variante « pour les courageux » de l’Ancien (l’Idiot révélé meurt avec lui), cartes Événement et leur fréquence. Les combinaisons sans effet ou incohérentes sont signalées.

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

Définis uniquement par des choix fermés : camp, action nocturne (aucune, découvrir, protéger, éliminer, marquer), fréquence, utilisations, auto-ciblage, effet à la mort (aucun ou tir), ordre de réveil et **condition de victoire calquée sur les rôles officiels** :

| Condition | Modèle officiel | Détail |
| --- | --- | --- |
| Avec son camp | Simple Villageois / Loup-Garou | rôles du village ou des loups |
| Seul survivant | Loup-Garou blanc | solitaire |
| Tous les autres survivants marqués | Joueur de flûte | nécessite l’action « marquer » (marque permanente) |
| Éliminé au premier tour | Ange | sinon il devient villageois ; renonce s’il est amoureux |
| Groupe opposé éliminé | Abominable sectaire | groupes définis à la création |

Ils sont validés à l’enregistrement et à l’import ; **aucun code n’est jamais exécuté**. Les rôles créés avant cette version reçoivent « avec son camp » (village, loups) ou « seul survivant » (solitaire).

## Composition équilibrée par l’historique

Option de la composition automatique : pour chaque rôle présent dans au moins 3 parties terminées, l’écart entre le taux de victoire du village avec ce rôle et le taux global ajuste son poids (amorti par le nombre de parties, borné à ±3). Calcul local, rien ne quitte l’appareil ; utile seulement après une dizaine de parties.
