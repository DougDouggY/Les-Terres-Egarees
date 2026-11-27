# Chapitres V et VI — Ressources graphiques et terrains d’aperçu

## Périmètre

Deux terrains graphiques préparatoires sont accessibles depuis l’accueil : **Cartes suivantes · essais**, puis **V · Le convoi** ou **VI · La forteresse**. Aucune bataille, position d’unité, condition de victoire, renfort ou scène narrative n’est ajoutée. Les coordonnées des objets décrivent une composition graphique à réviser, pas un déploiement militaire définitif.

Les cartes précédentes ne sont pas modifiées : le fichier des terrains III–IV ne reçoit qu’une extension de type. Le plan validé du château, le camp du chapitre II, les cartes officielles et les ressources protégées du prologue restent inchangés.

Précisions conservées pour une prochaine reprise : le ravitaillement devra présenter plusieurs villages visitables de 3 × 3 cases parmi les montagnes, l’eau et la forêt. Les abords du château devront prolonger le château déjà validé par un grand extérieur varié. Ces ajustements ne sont pas effectués dans cette tâche afin de respecter la consigne de conserver les cartes précédentes.

## Terrains

**Le convoi : 56 × 40 cases**, soit 3584 × 2560 pixels dans les exports. La route principale traverse une région boisée et montagneuse. Deux détours permettent des approches différentes avant et après le pont. Des formations rocheuses créent des passages resserrés ; deux bâtiments isolés et des espaces ouverts rompent les zones de forêt. Les accès de bordure et les clairières réservent de la place pour de futurs affrontements et renforts, sans en fixer les positions.

Deux chariots de démonstration appartiennent à la couche d’objets indépendante. Les masquer ou changer leurs coordonnées ne modifie pas le terrain. Leur déplacement en bataille n’est pas encore programmé.

**La forteresse : 56 × 44 cases**, soit 3584 × 2816 pixels dans les exports. L’enceinte de pierre occupe une grande partie du terrain. Elle possède six tours, une grande porte au sud et deux accès latéraux. La cour est reliée aux casernes, aux écuries, aux réserves et au quartier général. Les marges intérieures de l’enceinte restent dégagées pour circuler. À l’extérieur : relief, forêt, rivière et plusieurs itinéraires d’approche. Le même plan peut servir ultérieurement à un siège, une défense ou une reconquête ; ces missions restent à définir.

L’option **Intérieurs et portes ouverts** sert uniquement à inspecter les ressources et les passages. Elle retire les toits, conserve les murs et affiche les portes ouvertes. Les portes latérales réutilisent le sprite vu du dessus validé pour le château, sans tourner une façade à 90°. Les contrôles de passage vérifient les accès à la cour et aux portes des bâtiments.

## Style, échelle et raccords

Cases de 32 pixels dans le monde, exports de 64 pixels par case : mêmes unités que les aperçus précédents. Herbe, chemins, forêt, eau et montagnes réutilisent l’atlas du prologue. Les sols sont reliés par des masques adoucis. La maçonnerie et les objets supplémentaires ont été générés à partir de ces références.

Les atlas comportent 4 × 4 cadres de 256 pixels. Les textures remplissent les cases ; les objets conservent leurs proportions et leur transparence. Les bâtiments conservent des murs permanents, un sol strictement intérieur et un seuil séparé. Les côtés et angles du nord sont des plafonds pleins ; les angles du sud restent des façades. Les toits opaques sont répétés par case. Aucun personnage, texte ou marqueur n’est dessiné dans les ressources.

## Fichiers livrés

`public/assets/chapter-5-6/index.html` présente les ressources avec des liens de téléchargement. Cette page est accessible depuis **Tilesets → Ressources V–VI** dans l’aperçu.

- `fortress-materials.png` : maçonnerie, angles, toits, escaliers et sols.
- `objects-atlas.png` : planche transparente des seize objets.
- `objects/` : seize PNG distincts nommés, comprenant chariots, charrette, barricade, portes de forteresse et portes en bois ouvertes/fermées, cage vide, coffre, tonneaux, caisses, baliste, bélier, matériel d’écurie et armes.
- `side-gate.png` : ressource latérale existante du château, recopiée sans modification.
- `resources.json` : cadres, noms, ressources partagées et liste des cartes.
- `convoy/` et `fortress/` : `terrain.png`, `structures.png`, `roofs.png`, `doors.png`, `doors-open.png`, `objects.png`, `preview.png` et `layout.json`.

Le terrain, les structures destructibles à terme, les toits, les portes et le décor mobile sont des couches distinctes. `preview.png` assemble uniquement terrain, structures et toits ; les portes et objets restent séparés. L’interface affiche aussi les objets pour examiner leur taille et permet de les masquer. Les JSON contiennent des points de contrôle de connectivité des routes, explicitement distincts de positions de départ d’unités.

Sources originales conservées :

- Maçonnerie : `/workspace/generated_images/exec-9d2a9520-d360-4774-880c-9057f82a7185.png`.
- Objets : `/workspace/generated_images/exec-7c560d3b-b602-49fb-9db2-50279f94cdb8.png`.

Réexport : `node scripts/pack-chapter-5-6.mjs MAÇONNERIE.png OBJETS.png`, puis `node scripts/export-chapter-5-6.mjs`. Le premier découpe et nomme les images ; le second produit les couches et les plans depuis les données de l’aperçu.

## Vérifications

Les tests de données contrôlent les dimensions, les accès aux trois portes, la circulation vers les bâtiments et l’état bloquant des murs. Les tests navigateur vérifient les deux cartes sur ordinateur et téléphone, les exports, la conservation des sauvegardes et la transparence des objets. Ils comparent également les pixels pour vérifier que déplacer un chariot ne change pas le fond et que l’ouverture conserve les structures permanentes.

Les parcours précédents et le lancement compilé sont vérifiés séparément. Le bilan de livraison indique les résultats réellement obtenus ; aucune synchronisation de bataille coopérative nouvelle n’est revendiquée pour ces aperçus graphiques.

Bilan de cette livraison : 246 tests automatisés réussis ; 17 parcours navigateur réussis (4 nouveaux contrôles V–VI, 7 régressions des aperçus et transitions existants, 6 contrôles du lancement compilé). Compilation et contrôle des ressources du prototype réussis. Les exports ont été produits à partir des mêmes données et du même moteur de dessin que l’aperçu.
