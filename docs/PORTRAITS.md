# Portraits : audit et intégration

## Sources réellement reçues

ZIP « Sprite perso$.zip », quatre PNG lisibles, extraits sans retouche du dessin ni recomposition des corps. Les fonds sombres sont conservés dans les fichiers pour préserver cheveux et contours ; un masque d’affichage les retire sur la scène narrative plein écran. Les zones vides autour des bustes sont retirées. Les coordonnées exactes de chaque découpe sont dans `public/assets/portraits/extraction.json`.

| Planche | Identifiants, ordre gauche → droite puis haut → bas | Nombre | Répartition |
| --- | --- | --- | --- |
| chevalier 1.png | C01–C12 | 12 | C01–C07 hommes, C08–C12 femmes, répartition confirmée par l’utilisateur |
| viking 1.png | V01–V12 | 12 | Hommes V01–V05 et V09 ; femmes V06–V08 et V10–V12 |
| perso prédéfini.png | R01–R04 | 4 | Maëlys, sa sœur, Géraud, Atalia |
| PnJ.png | N01–N05 | 5 | Deux soldats bleus, deux soldats roses, un Sans-Repos |

Total : **33 portraits individuels**, dont 24 sélectionnables. Aucune image fictive n’est ajoutée. Les images sont affichées dans des cadres communs avec `object-fit: contain`, proportions conservées, épaules et cadrage d’origine préservés. Un miroir CSS oriente les interlocuteurs vers le texte (à gauche ou à droite) sans modifier les PNG.

Reproduction des découpes avec Python et Pillow : `python scripts/extract-portraits.py /chemin/vers/les/quatre/planches`.

## Scénario existant : constat avant modification

Le scénario exécutable et le plan éditorial ne sont pas au même stade d’implémentation. Cette intégration ne change aucune réplique, condition de recrutement, scène ou carte.

| Personnage | Identité dans le jeu | Apparition réelle et portrait |
| --- | --- | --- |
| Héros joueurs | p1a, p2a | Création puis arrivées du prologue ; portrait choisi séparément pour chaque joueur |
| Compagnons | p1b/p1c, p2b/p2c suivant faction et choix | Création puis prologue ; Astrid, Solveig, Bryn, Runa, Håkon ; Gaspard, Armand (clé de catalogue historique `alix`), Ysilde, Amaury |
| Maëlys | story-witch ; interlocuteur witch | Rencontre et révélation du nom dans la scène alliance de fin du **prologue** ; ajout effectif à l’équipe par recruitWitch lors de beginForestChapter. R01 permanent avant et après recrutement |
| Géraud | geraud ; interlocuteur geraud | Patrouille du chapitre 1 et scène c1-recruit ; condition storm conservée. R03 permanent, y compris lorsqu’il est ennemi |
| Capitaine de Valdren | valdren-captain ; interlocuteur captain | Patrouille du chapitre 1 ; portrait rose stable et distinct des autres personnages nommés. Le plan éditorial mentionne Aldric, mais le nom exécutable reste « Capitaine de Valdren » |
| Sœur de Maëlys | Pas d’unité ni de clé de dialogue exécutable | Évoquée dans c1-cave et dans le plan éditorial ; nom propre absent. R02 réservé, aucune unité inventée |
| Atalia | Pas d’unité ni de scène exécutable | Pas de chapitre 2 jouable ni d’apparition vérifiable. R04 réservé, sans créer un événement ni modifier le scénario |
| Soldats de Valdren | valdren-… | Patrouille du chapitre 1 ; N03/N04, casque gris conservé dans la source |
| Sans-Repos | e… et sanctuary-… | Prologue ; N05 réutilisable pour les anonymes |

Le texte de la demande situait Maëlys en fin de chapitre 1 et Atalia en fin de chapitre 2 : les fichiers ne permettent pas de confirmer cela. Les dates d’apparition existantes restent inchangées. Les réservations non encore reliées à une unité sont déclarées avec `unitId: null` dans `predefinedPortraits`, sans identifiant d’unité fictif.

## Attribution, création et sauvegarde

Après faction, nom, sexe, classe et autres paramètres, chaque joueur choisit son apparence dans le carrousel de l’étape Personnage, après une voix hors champ. Le filtre ne dépend pas de la classe. La sélection est indiquée et un grand aperçu est affiché. Le portrait de l’autre joueur est exclu et la création vérifie à nouveau compatibilité et unicité. La mécanique existante impose toujours une faction différente pour chaque joueur.

Le registre `Campaign.portraits` version 1 contient `assignments` (identité persistante → identifiant de portrait ou null ; chaque unité conserve aussi son portraitId et, pour les compagnons, sa clé d’identité de catalogue) et `issues`. Les portraits des deux héros sont réservés avant ceux des compagnons confirmés. Les candidats non retenus ne reçoivent plus de portrait dans les nouvelles parties ; leurs visages ne sont pas révélés dans le menu. Les anciennes réservations déjà sauvegardées restent conservées. Les portraits restants sont attribués aux personnages nommés compatibles, avec un choix déterministe basé sur la graine et l’identifiant de l’unité. Les portraits non sélectionnés restent disponibles pour les rencontres futures. Les portraits ne sont présentés qu’après confirmation ; leur attribution utilise exactement le même allocateur que la campagne. Aucune unité fictive n’est ajoutée à la carte ou à la sauvegarde.

Les réservations des unités mortes ou absentes sont conservées. Transfert de propriétaire, dialogue, chapitre, sauvegarde et rechargement ne renouvellent pas une association. Les anonymes peuvent partager N01–N05 ; un personnage nommé réserve un portrait distinct. Les futurs dialogues peuvent indiquer un `unitId` explicite pour réutiliser l’identité de l’unité, y compris N05.

En cas d’épuisement, l’association null et un motif sont enregistrés. L’interface affiche désormais un portrait générique PNJ importé (sans sprite de combat) ; aucun doublon silencieux ni nouvelle image n’est créé. Les sauvegardes anciennes sans registre sont enrichies une seule fois ; les associations historiques sont conservées ; l’affichage narratif utilise exclusivement les portraits importés et un secours PNJ si un ancien chemin pointe vers une autre ressource. Les identifiants inconnus, associations réservées illégales et doublons nommés sont refusés au chargement.

Les sprites sur la carte et en combat ne sont pas remplacés.

## Vérifications

- `npm test` inclut `tests/portraits.test.ts` : extraction/catalogue, filtres, deux héros, refus de doublons et portraits réservés, aperçu des recrues, rencontre, transition vers la forêt, rechargement, Maëlys et Géraud, soldats roses et Sans-Repos, migration, épuisement, validation du registre.
- `npx playwright test --config=playwright.portraits.config.ts` : choix réel dans la galerie, création complète et sauvegarde, reprise, affichage en dialogue des deux héros/Maëlys/Géraud et portrait ennemi dans une fiche.
- `npm run build`, `npm run build:prototype -- --base=/Les-Terres-Egarees/`, `npm run check:prototype`.

## Fichiers concernés

- Données et ressources : `src/data/portraits.ts`, `src/data/prologue.ts` (champ d’identité optionnel uniquement), `public/assets/portraits/` (33 PNG et manifeste), `scripts/extract-portraits.py`.
- Modèle et sauvegardes : `src/game/portraits.ts`, `types.ts`, `classes.ts`, `campaign.ts`, `forest-chapter.ts`, `save.ts` dans `src/game/`.
- Interfaces : `src/ui/portraits.ts`, `creator.ts`, `chapter-dialogue.ts`, `character-sheet.ts` dans `src/ui/`, `src/main.ts`, `src/style.css`.
- Vérifications : `tests/portraits.test.ts`, `tests/portraits.spec.ts`, `playwright.portraits.config.ts`, `package.json` ; mise à jour des deux assertions historiques de portrait vide dans `tests/character-v17.test.ts` et `tests/character-v17.spec.ts`.

Résultat de validation après refonte : 177 tests de logique et systèmes, 6 scénarios navigateur et un contrôle de création/reprise sur le prototype compilé avec son préfixe de publication, compilations standard et prototype et contrôle du prototype réussis. Aucun échec restant. Les apparitions de la sœur et d’Atalia ne sont pas testables en campagne puisque ces scènes ne sont pas implémentées.

La présentation et le parcours de création révisés sont décrits dans [CREATION-DIALOGUES.md](CREATION-DIALOGUES.md).

Le parcours narratif animé remplaçant la galerie de candidats est décrit dans [INTRODUCTIONS.md](INTRODUCTIONS.md).
