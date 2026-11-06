# V9 — Échelle des sprites et Sans-Repos

- Création : la taille du corps est désormais fixée à 72 pixels d’affichage, indépendamment de la classe, du sexe ou de l’amplitude des animations présentes dans l’atlas. Le rendu tient compte de la taille CSS réelle du canvas. Les grandes poses d’attaque ne réduisent plus la pose de repos.
- Dialogues : portraits provisoires à hauteur anatomique de 124 pixels dans leur canvas, au lieu de réduire l’ensemble des animations pour les faire tenir. Les acteurs sur la carte conservent la même échelle que pendant le jeu tactique. Les échelles de combat existantes, dont celles des montures et de l’ours, sont conservées.
- Galerie : l’aperçu sur carte utilise le même mode d’échelle que la carte réelle. Le zoom libre de l’inspecteur de planches est conservé pour voir toutes les poses.
- Compagnons : le lancier masculin se nomme **Armand**. Son identifiant historique reste stable pour préserver les sélections ; les compagnons masculins déjà enregistrés sous le nom Alix sont renommés. Les noms personnalisés des héros ne changent pas. Répartition inchangée : 3 femmes/2 hommes vikings proposés, 1 femme/3 hommes chevaliers proposés.
- Ennemis : uniquement des squelettes épéistes, hacheurs, lanciers et archers. Deux archers au total dans le chapitre, un par front. Les vrais atlas Sans-Repos déjà présents dans le projet sont utilisés sur la carte et en cinématique ; aucune apparence humaine n’est substituée. Les trois variantes ont désormais des définitions ennemies correspondant à leurs armes réelles.
- Sauvegardes V8 : les pillards, lanciers et chasseurs ennemis du chapitre sont remplacés par les variantes squelettes correspondantes. Positions, PV, blessures, initiative et nombre d’unités restent inchangés. Les anciens liens de skin humain sont retirés. Aucune résurrection ni nouvelle apparition au chargement.

## Vérifications

Tests logiques : composition exclusivement ennemie/squelette, quatre armes réelles, deux archers, migration V8 sans déplacement/soin/réordonnancement, nom de compagnon et stabilité d’une deuxième reprise.

Tests Chromium : planche de contrôle des classes, promotions et recrues dans les deux sexes ; mesures de hauteur des aperçus, références de carte et portraits ; disponibilité des profils de combat ; neuf compagnons de création ; changement de sexe du héros ; rendus repos/attaque des huit squelettes initiaux ; portrait de dialogue agrandi. Les atlas de cinématique sont décodés avant leur vérification visuelle, comme dans la préparation d’un combat réel. Captures dans `artifacts/sprite-v9/`.

La suite `npm test`, TypeScript et les constructions publique/prototype sont vérifiés. Aucun changement de carte, de décor, de statistiques alliées, de composition choisie ou de règles de progression.
