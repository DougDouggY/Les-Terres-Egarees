# État de livraison

**État actuel : Phase 1.** Voir [PHASE1.md](PHASE1.md) pour la boucle active, les classes et la galerie privée. La carte validée mesure 60 × 40 cases. Le camp permanent et les introductions décrits dans l’historique ci-dessous sont conservés en archive, retirés de la boucle actuelle. La fin du test ouvre un bilan sauvegardable. Aucun campement temporaire ni nouvelle ressource visuelle n’est créé.

## Historique du prototype initial

## Fonctionnalités réellement implémentées

Menu illustré, options et reprise, choix indépendant des factions, introductions
illustrées et variantes pour les identités de la seconde expédition, perspectives
et caméras séparées, observation côte à côte, carte manuelle 30×20, pathfinding
pondéré, lignes de vue avec angles opaques, mémoire et dissipation de la brume,
sélection, trajet, zones bleues et rouges, prévision, déplacement annulable,
soin, attente, IA, initiatives individuelles, combat latéral, projectiles, impacts,
parades/esquives, critiques et doubles frappes déterminés par le moteur,
expérience animée et fenêtre de niveau, orage, renforts limités, rencontre par
visibilité, fusion d'initiative, défense commune du sanctuaire, victoire, repli, camp, fiches et comparaison,
inventaire, carte du monde et sauvegarde locale.

Le scénario possède une fin jouable ; il ne dépend pas d'un bouton de victoire
ou de téléportations de débogage. La sauvegarde stable est préservée en cas de défaite. Le camp conserve les niveaux, blessures,
équipements, appartenances et consommables de la mission.

## Ressources originales créées

- Illustration d'accueil : côte, navire échoué et monastère.
- 32 scènes narratives sur deux planches dédiées, incluant les introductions,
  leurs variantes, quatre rencontres adaptées, la tempête, le repli, le camp
  et la carte du monde. Certaines scènes alternatives restent en réserve.
- Tileset dédié : 32 tuiles normalisées en cellules 32×32 pixels.
- 32 variantes de raccords de route, assemblées depuis les textures générées
  selon leur connectivité et leur sol (prairie ou sable).
- Deux spritesheets : 5 archétypes × 16 poses (80 cellules au total), dont
  huit phases d'attaque par archétype ; marche, défense, blessure et mort.
- Huit portraits peints : deux identités par rôle jouable.
- Quatre décors pixel art dédiés aux combats latéraux.
- Quatre épaves/chariots d’arrivée adaptés aux factions, avec empreintes logiques 3×2.

Les tuiles et sprites proviennent de planches conçues pour cet usage ; aucune
illustration de carte n'est découpée arbitrairement en cases. La transparence,
les cellules et les dimensions des sprites sont préparées et vérifiées.

Les images sont générées pour ce projet. Les polices Cormorant Garamond et
Manrope sont distribuées localement via Fontsource sous leurs licences.
Aucun graphisme Fire Emblem n'est inclus. Aucun service distant n'est utilisé
par le jeu une fois les ressources locales chargées.

## Validation

- Compilation de production TypeScript/Vite exécutée.
- 23 tests de règles, carte et ressources exécutés : coordonnées, occupations,
  connexité de toutes les cases praticables, chemins de chaque classe,
  déplacement pondéré, attaque, visibilité, rencontre, fusion, événements uniques,
  mort, expérience, niveaux, soins et sérialisation.
- Les quatre combinaisons de factions ont terminé la mission en simulation
  depuis leurs positions initiales, sans téléportation, avec les quatre survivants.
- Un parcours Chromium a été exécuté jusqu'au camp, en manipulant les vrais
  boutons et la carte : deux introductions, annulation de déplacement, Tab,
  combats, rencontre, alliance, victoire, camp, comparaison, carte du monde,
  sauvegarde et reprise. Les vérifications du moteur et du navigateur restent
  deux validations distinctes ; les quatre variantes n'ont pas toutes été jouées
  intégralement dans le navigateur.
- Les quatre configurations ont également été contrôlées dans l’interface, avec
  changement de perspective, observation côte à côte et sauvegarde de caméras indépendantes.
- Installation `npm ci --offline --cache /workspace/.npm-cache` réussie ; le cache
  et le verrou permettent de préparer à nouveau les mêmes dépendances.
- Le démarrage de la compilation de production a été vérifié dans Chromium,
  jusqu’à la fin des deux introductions et à la carte tactique.
- Captures réelles conservées dans `artifacts/`. Les chiffres du dernier passage
  figurent dans les sorties des commandes, pas dans une simulation visuelle.

## Limites à connaître

La mission possède son déroulement complet, mais la finition commerciale demandée
reste une appréciation artistique, pas une garantie fournie par les tests.
La continuité exacte des costumes générés entre les illustrations et les deux
planches de sprites demeure imparfaite. Les scènes narratives extraites des
planches ont une résolution inférieure à l'illustration d'accueil.

Les animations disposent de séquences réelles, mais certaines poses sont
réutilisées pour les contre-attaques et les états défensifs. Les parades représentent
la réduction de dégâts d'une armure, sans jet de blocage indépendant. Le tir est
représenté par un projectile animé, dont le rendu est vectoriel ; les combattants,
les terrains et les décors sont des images originales.

L'étude technique de Sacred Stones est documentée ; aucune comparaison visuelle
exhaustive avec ses cartes originales n'a été effectuée. Les secteurs de départ gardent leur géographie fixe ; leurs épaves ou chariots,
les personnages et les scènes sont adaptés aux factions choisies.

Les effets sonores sont synthétisés. Aucune voix ni bande musicale enregistrée.
La carte du monde est consultable ; les futures destinations sont verrouillées.
Aucun réseau multijoueur n'est implémenté. Les règles restent indépendantes du DOM
pour permettre une future autorité serveur.
