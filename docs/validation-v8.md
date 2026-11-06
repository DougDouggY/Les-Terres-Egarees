# V8 — Équipes, interface, entrée des ruines

## Création et chefs

Deux panneaux d’expédition et un cadre individuel pour chaque compagnon. Les aperçus sont les ressources réelles du jeu, recolorées avec les couleurs sélectionnées. Un compagnon par classe de base autorisée :

| Vikings | Classe           | Sexe  |
| ------- | ---------------- | ----- |
| Astrid  | Chasseur         | Femme |
| Solveig | Chaman           | Femme |
| Bryn    | Pillard          | Homme |
| Runa    | Lame nordique    | Femme |
| Håkon   | Guerrier du Nord | Homme |

| Chevaliers | Classe        | Sexe  |
| ---------- | ------------- | ----- |
| Gaspard    | Arbalétrier   | Homme |
| Alix       | Lancier       | Homme |
| Ysilde     | Homme d’armes | Femme |
| Amaury     | Épéiste       | Homme |

Aucun Sorcier compagnon initial. Le héros garde sa création de classe existante. Choix de deux compagnons vikings et d’un chevalier ; le choix supplémentaire remplace le plus ancien. Les identités, le sexe et la classe des unités déjà enregistrées ne sont pas réécrits à partir du nouveau catalogue.

Les couleurs déjà prises sont désactivées dans l’autre liste ; le rose reste absent et réservé aux ennemis. Le héros créé est le chef initial. À sa mort, les survivants choisissent leur nouveau chef avant de poursuivre. Le commandement donne +1 d’initiative effective, sans modifier les statistiques de base ni réordonner le cycle déjà engagé.

## Interface

- Une texture de pigment réaliste générée, mutualisée et teintée indépendamment : couleur du joueur à gauche, rose ennemi à droite. Aucune nouvelle ressource d’unité ou de portrait générée.
- XP et niveau centrés sur la carte ; statistiques initiales, bonus successifs en vert avec survol, puis mise à jour simultanée des valeurs et activation de Continuer. La présentation ne lance aucun nouveau tirage.
- Fiche et équipement bois/parchemin avec encre sombre lisible. Dimensions de la prévision conservées.
- Lueur du sanctuaire renforcée sans modifier la visibilité logique. Unités immobiles pendant les répliques de fin, hormis l’intervention, l’arrivée de la sorcière et le départ scénarisés.

## Terrain et chapitre I

Les routes coûtent 0,75 ; le calcul du rayon accessible et l’exécution du chemin utilisent ce coût. Aucun terrain/décor/dimension n’est remplacé. Les futures routes pavées à 0,50 ne sont pas créées.

Les nouvelles parties ont huit ennemis initiaux, quatre sur chaque front : épée, hache, lance et arc. Six ennemis supplémentaires arrivent avec la horde, puis deux sentinelles à la rencontre, soit seize au total au lieu de huit. Les classes/sprites existants sont réutilisés ; leurs statistiques générales ne sont pas modifiées. Les instances de ce chapitre sont faibles (18 PV, force 4–5, défense 1). Les sentinelles arrivent hors des cases attaquables après un déplacement allié et ne peuvent pas attaquer pendant leur première activation.

La première équipe arrivée sécurise les débris et les abords par un dialogue privé, sans annoncer l’autre groupe. Cette arrivée attire vers les ruines les ennemis sans cible engagée. Les ennemis ayant déjà acquis une cible la poursuivent.

Après la rencontre, les deux chefs doivent se placer à l’entrée ou sur une case adjacente et choisir **Se préparer à rentrer**, chacun pendant son activation. Les ennemis doivent être repoussés au-delà de cinq cases de l’entrée. Le premier chef reste en position ; la confirmation du second lance l’alliance, la sorcière et le départ, puis le bilan de chapitre. Il n’est pas nécessaire de traquer les ennemis restés loin dans la forêt. Déplacement ou décès invalide une préparation devenue caduque. Aucun chapitre II n’est créé.

Les sauvegardes V7 en cours sont conservées, avec affaiblissement des ennemis du chapitre et conservation proportionnelle des blessures ; aucune unité supplémentaire n’apparaît au chargement. Pour la nouvelle composition complète et les nouveaux choix initiaux, commencer une nouvelle aventure.

## Coopération : préparation, pas de service réseau déployé

Le prototype reste jouable localement avec les deux équipes. Des points d’intégration pour un futur transport existent : propriétaire de la session, restriction des commandes et du menu de changement de perspective, masquage des dialogues privés à l’autre propriétaire, filtrage des résultats selon le joueur actif.

Les scènes communes disposent d’accusés de lecture par réplique. La progression exige les deux lectures ; doublons et commandes visant une ancienne réplique sont ignorés. Les accusés sont sauvegardés. Les dialogues privés sont confirmés uniquement par leur propriétaire. Les attaques, zones et application d’événements de dégâts ne peuvent pas blesser l’autre équipe ; les bannières alliées sont également protégées.

**Cloudflare et une vraie partie entre deux PC ne sont pas mis en place ni testés ici.** Le futur serveur devra authentifier le propriétaire des commandes, faire autorité sur les résultats et l’initiative, synchroniser les accusés et attendre la fin de la présentation du joueur actif avant de reprendre. Les clients spectateurs devront recevoir la cinématique puis les instantanés, sans simuler un deuxième résultat ou faire avancer le tour eux-mêmes. Le point d’entrée d’instantané UI n’est pas une authentification ni un moteur multijoueur complet.

## Validation

- Dix tests logiques V8 : routes, composition/armes/renforts, arrivées sûres, IA, lecteur lent/doublons/reprise, double confirmation, chefs, protection alliée, filtrage des résultats, migration et catalogue des compagnons.
- Sept tests navigateur : couleurs, combat et bonus de niveau, fiches/équipement, succession, séparation des vues préparées, fin de chapitre depuis les actions tactiques, création et sprites des neuf compagnons sur ordinateur et mobile.
- Suite existante `npm test` passée ; après extension du catalogue, tests V4/V5/chapitre V7 relancés et passés (25 cas). Test d’intégrité de la carte conservé, avec normalisation du seul coût de route explicitement autorisé avant comparaison au hash visuel initial.
- Compilation TypeScript et constructions publique/prototype, contrôle de séparation des outils de développement. Captures contrôlées dans `artifacts/chapter1-v8/`.
