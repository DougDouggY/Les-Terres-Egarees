# Chapitre 1 — Pour ne pas oublier

## Parcours livré

La fin du prologue conserve les répliques de l'alliance jusqu'à « Il doit bien y avoir un moyen. ». La suite suit le texte demandé. La sorcière devient une unité réelle de l'équipe Chevalier, sans dépendre du numéro du joueur et sans dupliquer une recrue déjà présente. Le carton du chapitre 1 conduit ensuite à la patrouille de Valdren.

Le choix exige deux votes concordants. Un vote seul attend, des votes différents restent modifiables. La réponse validée et les votes en attente sont sauvegardés. Les dialogues communs demandent l'acquittement de chacun via les hooks de session existants, réplique par réplique ; les messages périmés et les doubles acquittements ne font pas sauter une ligne.

Les deux branches rejoignent la même bataille. La branche des tempêtes rouges permet l'action volontaire **Parler à Géraud**, uniquement pour une unité Chevalier adjacente pendant son activation. Le portrait de dialogue est celui du chef Chevalier pour ses répliques, même si un compagnon déclenche l'action. Le recrutement change seulement son propriétaire/front : case, PV, état, ordre d'initiative et tours dépensés restent conservés. L'action de l'interlocuteur est consommée à la fin de la discussion. Les voies de promotion de Géraud sont Homme d'armes / Lancier au niveau 10.

Après élimination des ennemis restants (Géraud allié exclu), la conversation de la grotte présente les recherches, les souvenirs, la sœur capturée et la future rencontre des Écorcheurs. Aucun événement du chapitre 2 n'est joué et aucune information cachée sur la sœur n'est révélée. Le nom du roi n'était pas défini dans les données narratives : `narrativeNames.knightKing`, dans `src/data/forest-chapter.ts`, reste vide et facilement modifiable. Le dialogue peut citer « ce nom » sans inventer de canon.

## Carte, équipes et ressources

- Nouvelle carte forestière 60 × 40, sans brouillard, avec un sentier central à deux cases de largeur, des itinéraires secondaires, bois, sous-bois, rochers et reliefs. Aucun village ni bâtiment du prologue n'y est dessiné.
- Sept adversaires : capitaine, deux Hommes d'armes, deux Lanciers, un Arbalétrier et Géraud. Aucun Sans-Repos. Le capitaine a 26 PV contre 20 pour les soldats ; seules les unités de cette rencontre ont ces réglages. Les classes, règles de combat et statistiques des héros ne sont pas rééquilibrées.
- Les unités réelles du prologue sont transférées, jamais reconstruites à partir de valeurs par défaut. Noms personnalisés, sexe, classe, équipement, XP, niveau, inventaire et morts restent enregistrés. Les survivants récupèrent leurs PV aux transitions ; les morts ne sont pas ressuscités. Les invocations temporaires sont retirées.
- L'Écuyer garde l'identifiant d'arme compatible `training_sword`, désormais affiché **Épée légère**. Les coefficients restent inchangés. Une correction de matériau au rendu donne une lame métallique aux atlas existants, sur carte et en combat, homme et femme. Les zones de lame sont explicitement masquées ; peau, vêtements, poignée et alpha sont préservés. Aucun PNG, portrait, sprite ou animation n'est régénéré.
- La grotte utilise un fond uni/gradient sombre et les petits sprites du système de dialogue, sans illustration nouvelle.

## Compatibilité et fichiers

`src/game/map.ts` demeure inchangé, ainsi que les images et le placement du prologue. `src/game/active-map.ts` conserve l'identité du tableau utilisé par le moteur et commute entre le modèle du prologue et `src/data/forest-map.ts`. Le cache du rendu est invalidé uniquement au changement de carte ; le village est dessiné seulement au prologue. Le hash protégé du rendu `terrain.ts` est actualisé pour cette adaptation explicite ; les références de carte et les images restent protégées.

Les modules `src/data/prologue.ts` et `src/game/prologue.ts` fournissent des alias de nommage. L'ancien champ sérialisé `chapter1` et les identifiants `chapter1:*` restent lisibles pour éviter une migration risquée des sauvegardes. Le nouveau progrès est distinct : `forestChapter` et `mapId: "forest"`. Une sauvegarde V10 déjà à la fin du prologue propose **Poursuivre · Chapitre 1**.

Les principaux ajouts sont `src/data/forest-chapter.ts`, `src/data/forest-map.ts`, `src/game/forest-chapter.ts`, `src/game/active-map.ts`, `src/sprites/weapon-material.ts` et les tests associés. Les points d'intégration sont le directeur de dialogue, le menu d'actions, les transitions, l'IA/visibilité, les sauvegardes et le rendu de terrain. Le moteur des attaques et les animations validées ne sont pas refondus.

## Outil de développement

**Menu principal → Tester chapitre 1** lance la finale du prologue, puis l'ensemble du nouveau contenu. Le test utilise `lte-chapter-one-test`, jamais `lte-save`. **Reprendre le test du chapitre 1** reprend ce créneau distinct. Dans Échap et au bilan, **Recommencer la rencontre (test)** recharge le début du chapitre pour refaire le choix et la bataille. La sauvegarde normale n'est pas écrasée. Ces entrées sont absentes de la compilation publique et présentes dans le prototype de test publié.

## Vérifications et limites

- Suite complète `npm test`, dont huit nouveaux tests du moteur : transfert, morts, absence de brouillard, vote/attente/reprise, recrutement réservé, factions inversées, Géraud déjà joué/à venir, victoire/grotte/défaite, promotions et masques de matériau.
- Parcours Playwright : finale réelle du prologue → carton → patrouille → votes différents puis accord → bataille ; sauvegarde normale préservée et redémarrage du test.
- Action Parler et toutes les répliques de recrutement ; PV, case et prochain acteur contrôlés ; branche voyageurs sans Parler ; scène de la grotte jusqu'au bilan.
- Interface du vote sur mobile, contrôle exclusif de son vote et réception d'un état distant simulé. Régressions du créateur V10, portées D/survol, Chamane et équipement, et finale du prologue adaptées à la nouvelle transition.
- Captures dans `artifacts/chapter-one/` : carte, vote, vote mobile, recrutement, grotte et poses de l'Écuyer/Écuyère. Contrôle visuel effectué en plus des tests de chargement.
- Compilations TypeScript/Vite publique et prototype et contrôles d'absence/présence des outils de développement.

Le transport Cloudflare réel n'existe pas encore dans ce prototype. La coopération est vérifiée via les votes, les acquittements et les instantanés de session du moteur ; aucun test à deux ordinateurs connectés à un serveur inexistant n'est revendiqué. Les illustrations de grotte et portraits définitifs sont volontairement différés. L'équilibrage de la patrouille reste ajustable après essai joueur.
