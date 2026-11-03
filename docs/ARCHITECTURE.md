# Architecture et règles

`src/engine.ts` réexporte les systèmes de `src/game/` : campagne, carte, unités, déplacement, pathfinding, visibilité, combat, IA, inventaire et sauvegarde. Cette API ne dépend ni du DOM, ni des images, ni d'une horloge. Son état de campagne est sérialisable. Un serveur autoritaire futur pourra exécuter les mêmes règles ; la synchronisation et le transport réseau ne sont pas implémentés.

`src/main.ts` orchestre les écrans, les commandes locales et les animations. Les dégâts sont calculés avant le combat, appliqués à chaque impact, et jamais recalculés par le rendu. Le verrou d'action interdit les changements de perspective et les commandes concurrentes pendant un déplacement ou un combat.

La carte de 60 × 40 cases est définie dans `src/game/map.ts`. Les coordonnées logiques utilisent des cases carrées de 32 pixels. `Cell` définit les coûts, la défense, l’opacité et l’identifiant de tuile. `src/terrain.ts` assemble l’atlas régional, les raccords de côte et les chemins. `src/landscape.ts` dessine les bois avec une marge d’herbe et des arbres de liaison sur les seuls bords partagés ; trois compositions de pics montagneux alternent sans fusion. Le cache du terrain est indépendant de la visibilité et de la sélection.

La caméra rapproche la vue ×1,65 ; le calcul du survol, les clics et le glisser utilisent la même transformation. Le glisser capte le pointeur et supprime toute commande de déplacement après le seuil de 5 pixels. Caméras bornées indépendantes par expédition. Les informations au survol n’exposent aucune unité masquée par la visibilité logique. La fiche sélectionnée est une fenêtre non modale à l’intérieur de la carte.

Le pathfinding pondéré tient compte des terrains et des occupations. Une activation comprend un déplacement au plus, puis une attaque, un soin ou une attente. Le déplacement est annulable jusqu'à la confirmation de l'action. Les ennemis utilisent les mêmes déplacements et règles d'attaque.

Chaque perspective conserve une caméra, des découvertes, une visibilité, une introduction et un journal. Avant la rencontre : deux ordres d'initiative. À la rencontre visuelle : interruption narrative, partage de vision, reconstruction unique de l'ordre commun avec toutes les unités vivantes. Les unités restent possédées par leur expédition.

L'expérience, les niveaux, les inventaires, les événements uniques, les deux champs de découverte et la progression du camp sont enregistrés dans localStorage (clé `lte-save`). Pas de sauvegarde pendant les animations, cinématiques ou déplacements provisoires. Les sauvegardes sont versionnées (version 1).

## Équilibrage

Dégâts physiques : max(1, Force − Défense − couvert). Précision : entre 25 et 98 %, précision − deux fois l'agilité adverse. Critique : max(2, agilité / 2 arrondie), dégâts ×3. Double frappe si l'écart d'agilité atteint 4. Contre-attaque seulement si le défenseur survit et respecte portée et ligne de vue. Générateur pseudo-aléatoire initialisé et sérialisé, progression de niveau fixe (+3 PV, +1 Force, +1 Défense).

Une horde finie de deux renforts apparaît au troisième round. Deux sentinelles supplémentaires, également finies, émergent à la rencontre afin que la défense commune ne puisse pas être sautée en nettoyant préalablement les deux fronts. La mort des deux chefs entraîne la défaite. La destruction de tous les ennemis après la rencontre déclenche le repli puis le camp.


## Migration de carte, révision 5

Les anciennes positions de carte (30 × 20) sont doublées dans les deux axes.
Les indices d’exploration deviennent quatre cellules correspondantes dans la
nouvelle largeur. La visibilité est recalculée et les caméras réinitialisées.
Toute unité sur un nouvel obstacle rejoint la cellule libre la plus proche.
PV, XP, inventaires, initiative et progression narrative sont conservés.


## Viewport de bataille adaptatif

Le terrain remplit toute la fenêtre sous les commandes superposées. Le rendu
conserve environ 18 colonnes en paysage et adapte les lignes à la hauteur réelle.
Le tampon Canvas suit les pixels de l’écran (densité plafonnée à 2), la même
transformation servant au dessin, au survol et aux déplacements. Lors d’un
redimensionnement, le centre des caméras est conservé puis borné à la carte.
Les canopées peintes originales sont masquées et raccordées dans le cache du
terrain ; elles ne modifient ni les cellules ni la graine de combat.

## Camp évolutif et sorties narratives

`src/game/camp.ts` définit trois bâtiments à deux niveaux et six sorties à choix.
Chaque sortie correspond à une réparation précise ; le niveau suivant exige la
réparation précédente du même bâtiment. Les étapes briefing/choix/résultat sont
sérialisées dans `Campaign.camp`, avec la liste des sorties terminées et le
verrou de l’affûtage. Les anciennes sauvegardes reçoivent un camp en ruine.

Les choix attribuent des ressources et éventuellement une blessure non létale à
l’éclaireur le plus agile. L’enceinte réduit ces blessures et peut ajouter un
vivre. Les soins, les potions et l’affûtage consomment leurs ressources et
modifient réellement les survivants ; aucun mort n’est ressuscité. Les sorties
sont narratives dans cette version, sans nouvelle carte de bataille ni système
de classes supplémentaire.

Le raccourci de test près des ruines suit la fin narrative normale, conserve
les PV et XP des survivants et marque explicitement son usage dans l’historique.
Le terrain passe en révision 7 : forêt dense praticable (coût 3, couvert 3),
avec opacité conservée. Le sous-bois reste à 2 / 2.
