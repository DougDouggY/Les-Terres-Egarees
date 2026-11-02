# Ressources graphiques originales

Les images de ce dossier ont été générées pour Les Terres Égarées, puis préparées
pour le moteur. Aucune ressource Fire Emblem n'est incluse.

- hero.png : illustration originale de l'accueil.
- scene-0.png à scene-31.png : plans narratifs indépendants et variantes de rencontre.
- portrait-0.png à portrait-7.png : Eirik, Astrid, Ysilde, Gaspard, Bryn, Solveig, Maël, Alix.
- tiles.png : nouvel atlas cartoon 8×4, cellules natives 128×128 pour des cases logiques 32×32.
- roads.png : atlas 4×8 de raccords, bitmask N=1 E=2 S=4 O=8 ; première moitié prairie,
  seconde moitié sable. Assemblé à partir des textures originales, pas de nouveau décor procédural.
- sprites.png : atlas 8×5, cellules 128×128, transparence alpha. Lignes : guerrier
  nordique, archer, homme d'armes, arbalétrier, squelette. Colonnes : repos, deux
  phases de marche, préparation, attaque, défense/esquive, blessure, mort.
- attacks.png : atlas 8×5, mêmes archétypes, huit poses de préparation, frappe et
  récupération. Ces dessins sont distincts des poses tactiques.
- battle-0.png à battle-3.png : décors de combats, sanctuaire, plage, forêt et ruines.
- arrivals.png : atlas 2×2 ; chaque objet occupe une empreinte logique 3×2 cases
  (96×64 pixels). Colonnes : épave nordique / chariot chevalier. Lignes : secteur 1 / 2.
  Toutes les cellules occupées sont impraticables et opaques dans les données de carte.

Les planches sources sont conservées dans /workspace/generated_images dans
l'environnement de création. Les fichiers de jeu préparés ici sont autonomes ;
ils n'ont pas besoin de ce répertoire ni d'une API de génération au lancement.

Le tileset cartoon a été créé après accord explicite de l’utilisateur, en une
seule génération. Source haute résolution : artifacts/tiles-cartoon-source.png.
roads.png reprend les textures de ce nouvel atlas en cellules 128×128. Les
cinématiques, portraits et sprites ne sont pas remplacés par cette passe.

`grass-variants.png` : huit compositions préparées à partir de l’herbe existante
(une variante nue, des touffes isolées et des groupes). Chaque cellule est en
128×128 ; les bordures communes évitent les coutures. Préparation reproductible
avec `python3 scripts/prepare-grass.py`, puis `python3 scripts/prepare-roads.py`.
Les trois rendus et leurs raccords sont assemblés côté client depuis ces mêmes
ressources ; aucune nouvelle planche IA n’a été générée pour l’atelier.
