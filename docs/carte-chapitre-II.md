# Chapitre II — Le petit campement

Version du 26 novembre 2026. L’aperçu conserve la carte rapprochée de 32 × 26 cases et l’accès Accueil → **Carte du chapitre 2**.

## Bâtiments et chemins

Les cinq maisons sont remplacées par quatre bâtiments : petite maison (6 × 5 cases), entrepôt, dortoir des soldats et bâtiment des cellules (9 × 7 cases chacun). L’entrepôt contient des caisses et tonneaux, le dortoir des couchages et la détention des cloisons et portes de cellules vides. Aucun prisonnier ni recrutement n’est ajouté.

Les chemins utilisent la texture du chapitre I, sur deux cases de large, avec son masque de transition adouci vers l’herbe. La petite place, les accès, le cours d’eau et la végétation sont conservés.

## Ouverture

Chaque bâtiment comporte des couches indépendantes : plancher intérieur, mobilier, quatre murs permanents et toit amovible. Ouvrir la porte masque seulement le toit et change l’état de la porte. Les murs périphériques restent présents et bloquants ; aucune clôture ne les remplace. Le plancher ne couvre pas les cases de murs. Le seuil devient praticable lorsque la porte est ouverte. Le mobilier bloque le passage. Fermer restaure exactement les cases initiales.

Cette commande reste une inspection libre de l’aperçu, sans action de combat ni écriture dans les sauvegardes. Aucune armée, condition de victoire, récompense ou nouvelle règle de campagne n’est créée. Quitter l’aperçu restaure la carte précédente.

## Ressources

`public/assets/kingdom-camp/buildings-layered.png` : atlas transparent de 1152 × 1024 pixels, 18 colonnes et 16 lignes de cellules de 64 pixels. Quatre toits occupent les blocs de 9 × 6 cellules des douze premières lignes. Les seize modules de murs, portes et intérieur occupent les quatre premières colonnes des quatre dernières lignes. Neuf accessoires conservés occupent les colonnes 4 à 12 de la ligne 12.

`src/data/village-tileset.ts` décrit les cadres. Réexport : `node scripts/build-camp-building-tileset.mjs TOITS.png MURS.png`. Le script assemble les images sans repeindre les illustrations. Les anciens atlas sont conservés séparément et ne sont plus chargés par cet aperçu.

Sources de cette version dans l’espace de travail :

- Toits : `/workspace/generated_images/exec-64b5d871-eff3-4539-b390-316eeba8ad7c.png`.
- Murs et intérieurs : `/workspace/generated_images/exec-315260e2-beb2-4606-ae94-0381b5ca33aa.png`.

## Vérifications

243 tests automatisés réussis. Cinq parcours navigateur réussis : carte sur ordinateur et téléphone, zoom, pincement, déplacement, ouverture, passage intérieur, retours et deux branches narratives sans altérer les sauvegardes. Les comparaisons des pixels des quatre bâtiments vérifient l’absence de plancher sous les murs, la permanence des murs hors porte et la disparition du toit uniquement à l’ouverture. Le masque des chemins est vérifié sur son centre et ses bords. Compilation et contrôle des ressources réussis.

Les fichiers concernés sont les données du camp et du tileset, le rendu et l’interface du camp, l’atlas et son script d’assemblage, l’indication de version de l’accueil et les tests associés. Les règles de combat et le scénario ne sont pas modifiés.
