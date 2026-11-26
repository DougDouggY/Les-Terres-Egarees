# Terrains suivants et nouveaux tilesets

Trois atlas générés pour préparer les prochaines cartes, dans la palette du terrain du prologue :

- `public/assets/future-terrain/camp.png` : paille, bardeaux de bois, plafonds de poutres vus du dessus, murs et angles de façade, planchers et cultures.
- `public/assets/future-terrain/castle.png` : pavés, pierre moussue, murs en ruine, angles, escaliers et végétation.
- `public/assets/future-terrain/wilds.png` : herbe, terre, ruisseau, végétation, ponts et ravitaillement.

Chaque atlas livré comporte 4 × 4 cellules de 256 pixels, soit 1024 × 1024 pixels. `scripts/pack-future-tilesets.mjs` normalise le découpage des trois images sources, sans repeindre les illustrations.

## Carte du chapitre II

Les plafonds utilisent désormais une vraie texture générée à leur taille, au lieu d’une fine poutre étirée. Les deux angles de façade sud sont des murs, ouverts comme fermés. Les toits sont des textures de paille ou de bois répétées par case, sans revenir à une grande illustration en perspective. Le puits n’est pas modifié.

## Cartes d’essai

Accueil → **Cartes suivantes · essais** donne accès à deux terrains de 36 × 28 cases :

- **Chapitre III · Abords du château oublié** : une approche en ruine avec plusieurs accès. Ce terrain extérieur ne remplace pas le plan intérieur du château déjà validé, disponible via **Explorer le château validé**.
- **Chapitre IV · Chemins du ravitaillement** : un ruisseau avec deux traversées et un itinéraire forestier vers du matériel entreposé. Il s’agit d’une proposition de terrain pour l’expédition prévue dans le scénario.

Zoom, glissement, pincement, grille, éclairage nocturne et export PNG sont disponibles. Les trois atlas sont consultables séparément depuis le même écran.

Ces cartes restent des propositions graphiques : aucun ennemi, dialogue, objectif de victoire, recrutement ou événement de campagne n’est inventé. L’option de nuit permet d’examiner les ressources sous cet éclairage ; elle ne constitue pas une bataille de défense nocturne implémentée. Le système de sauvegarde et la carte active de la campagne ne sont pas utilisés par cet écran.

## Vérifications

Les tests de données vérifient les dimensions, les indices du tileset, l’indépendance des deux plans et un chemin entre leurs accès principaux. Les tests navigateur couvrent les deux cartes, les trois atlas, le zoom, la grille, la nuit, l’export, les retours vers l’accueil et le château, ainsi que la conservation des sauvegardes. Le rapport de fin de tâche indique les résultats effectivement obtenus.

Sources originales conservées dans l’espace de travail :

- Camp : `/workspace/generated_images/exec-18be29da-d56d-487e-b2be-61998d34f514.png`.
- Château : `/workspace/generated_images/exec-692c8773-1230-4cd6-962e-2d313a015dfd.png`.
- Forêt : `/workspace/generated_images/exec-bceb4fc8-da28-45c1-b36e-999f1ecca4b9.png`.

Les trois atlas sont intégrés au dépôt. Vérification de cette version : 244 tests de données et systèmes réussis ; sept parcours navigateur pour le camp, les nouvelles cartes et les transitions narratives, plus les six contrôles du lancement compilé. Le contrôle spécifique des angles compare les pixels des angles sud aux nouvelles façades, pour éviter de remettre un plafond à leur place.
