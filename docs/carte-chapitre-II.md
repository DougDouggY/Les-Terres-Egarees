# Chapitre II — Le petit campement

Version du 26 novembre 2026. L’aperçu conserve la carte rapprochée de 32 × 26 cases et l’accès Accueil → **Carte du chapitre 2**.

## Bâtiments et chemins

Les bâtiments sont disposés de manière décalée, avec des façades sur quatre lignes différentes et des chemins coudés plutôt que quatre coins réguliers. Le puits occupe 2 × 2 cases, visuellement et pour le passage.

Les cinq maisons sont remplacées par quatre bâtiments : petite maison (6 × 5 cases), entrepôt, dortoir des soldats et bâtiment des cellules (9 × 7 cases chacun). L’entrepôt contient des caisses et tonneaux, le dortoir des couchages et la détention des cloisons et portes de cellules vides. Aucun prisonnier ni recrutement n’est ajouté.

Les quatre cases du champ se raccordent par un échantillon intérieur sans bordure individuelle, avec raccords miroirs. Le puits reste inchangé.

Les chemins utilisent la texture du chapitre I, sur deux cases de large, avec son masque de transition adouci vers l’herbe. La petite place, les accès, le cours d’eau et la végétation sont conservés.

## Ouverture

Chaque bâtiment comporte des couches indépendantes : plancher intérieur, mobilier, quatre murs permanents et toit amovible. Le rendu reprend les principes du château : couverture opaque de toutes les cases cachées et murs composés en lignes continues. Le mur du fond reste une face verticale. Les deux colonnes latérales complètes et les quatre angles utilisent maintenant un plafond plein en bois, tiré de la poutre supérieure des murs. Pour la petite maison, cela couvre notamment les cases 260, 265, 292, 297, 324, 329, 356 et 361. Les angles de la façade suivent le même principe, ouverte ou fermée. Le toit fermé réutilise exactement la texture du château (`assets/material-tests/castle-atlas.png`, cadre 633, 320, 303, 300), répétée case par case plutôt qu’une grande illustration étirée. Les montants de porte ont un fond opaque ; seule l’ouverture centrale donne sur le seuil. Ouvrir la porte masque seulement le toit et change l’état de la porte. Les murs périphériques restent présents et bloquants ; aucune clôture ne les remplace. Le plancher ne couvre pas les cases de murs. Le seuil devient praticable lorsque la porte est ouverte. Le mobilier bloque le passage. Fermer restaure exactement les cases initiales.

Cette commande reste une inspection libre de l’aperçu, sans action de combat ni écriture dans les sauvegardes. Aucune armée, condition de victoire, récompense ou nouvelle règle de campagne n’est créée. Quitter l’aperçu restaure la carte précédente.

## Ressources

`public/assets/kingdom-camp/buildings-layered.png` : atlas transparent de 1152 × 1024 pixels, 18 colonnes et 16 lignes de cellules de 64 pixels. Quatre toits occupent les blocs de 9 × 6 cellules des douze premières lignes. Les seize modules de murs, portes et intérieur occupent les quatre premières colonnes des quatre dernières lignes. Neuf accessoires conservés occupent les colonnes 4 à 12 de la ligne 12.

`src/data/village-tileset.ts` décrit les cadres. Réexport : `node scripts/build-camp-building-tileset.mjs TOITS.png MURS.png`. Le script assemble les images sans repeindre les illustrations. Les anciens atlas sont conservés séparément et ne sont plus chargés par cet aperçu.

Sources de cette version dans l’espace de travail :

- Toits : `/workspace/generated_images/exec-64b5d871-eff3-4539-b390-316eeba8ad7c.png`.
- Murs et intérieurs : `/workspace/generated_images/exec-315260e2-beb2-4606-ae94-0381b5ca33aa.png`.

## Vérifications

243 tests automatisés réussis. Cinq parcours navigateur réussis : carte sur ordinateur et téléphone, zoom, pincement, déplacement, ouverture, passage intérieur, retours et deux branches narratives sans altérer les sauvegardes. Les comparaisons des pixels des quatre bâtiments vérifient l’absence de plancher sous les murs, la permanence des murs hors porte et la disparition du toit uniquement à l’ouverture et une couverture entièrement opaque de chaque toit fermé, les colonnes de plafond identiques des deux côtés et l’absence de pixels transparents sur les montants des portes ouvertes et fermées. Le puits bloque ses quatre cases et les emprises restent sans chevauchement. Le masque des chemins est vérifié sur son centre et ses bords. Compilation et contrôle des ressources réussis.

Les fichiers concernés sont les données du camp et du tileset, le rendu et l’interface du camp, l’atlas et son script d’assemblage, l’indication de version de l’accueil et les tests associés. Les règles de combat et le scénario ne sont pas modifiés.
