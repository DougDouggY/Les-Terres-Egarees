# Synchronisation des esquives et approche des Lames nordiques

## Changements

Les esquives des Lanciers, Hommes d’armes, Épéistes, Guerriers du Nord, Pillards et Lames nordiques masculines sont synchronisées avec l’impact. Une brève anticipation précède la frappe, puis le retrait maximal coïncide avec l’arrivée de l’arme. L’essai utilise la pose d’impact déclarée de chaque attaque ; le moteur de campagne emploie le même réglage de réaction. Les probabilités, dégâts et événements de combat ne changent pas.

En mêlée, l’esquive de la Lame nordique féminine conserve ses dessins, ses cellules et sa progression précédemment validés. Les esquives face aux flèches et carreaux gardent le réglage récemment approuvé.

Une boule de feu esquivée continue au-delà du point visé et s’atténue sans explosion. Les effets d’impact restent présents lorsque la cible est touchée. L’essai et la campagne transmettent leur résultat de frappe au même effet visuel ; le projectile ne poursuit pas le déplacement d’esquive de la cible.

La Lame nordique masculine dispose de quatre nouveaux pas rapides, avec son apparence actuelle de combat (cheveux blonds libres, tunique et cape bleues, épée sans bouclier). Les déplacements des deux Lames nordiques ont un axe stable raccordé à leur garde. Leur approche se termine avant qu’une boucle supplémentaire de pas ne commence ; elles passent en garde avant l’attaque. Une distance minimale empêche le rapprochement excessif des corps. Les nouvelles poses servent également au déplacement sur la carte.

Les autres dessins, les portraits, les cartes, le scénario, les classes et les sauvegardes sont conservés.

## Vérifications

- 216 tests automatiques : 67 visuels, 149 systèmes.
- 14 tests navigateur de l’essai et de la présentation de combat, dont des contrôles directs du moteur de campagne pour les 13 variantes de mêlée concernées, et des deux Sorciers sur touche/esquive.
- Contrôle des quatre variantes d’arc/arbalète : le test utilise un ralenti de 0,25 pour ne pas sauter sa courte fenêtre d’observation lors d’une image de rendu lente. Aucun réglage du jeu n’a été changé pour ce test.
- Contrôle des deux approches nordiques : mouvement avant l’arrêt, garde au même emplacement ensuite, distance suffisante entre les corps et ressource masculine renouvelée.
- Contrôle de l’identité de l’esquive féminine : définition identique à l’archive antérieure et maintien de la progression approuvée.
- Test navigateur des introductions des deux factions, dont l’affichage sur téléphone.

La validation visuelle finale des ajustements reste celle du joueur.

## Fichiers principaux

- `src/ui/combat-reactions.ts`, `combat-v2.ts`, `contact-preview.ts`, `combat-effects.ts` : synchronisation, arrêt de l’approche et résultat du projectile.
- `src/sprites/geometry.ts` : espacement minimal des Lames nordiques.
- `src/assets/tactical/combat-v4-refinements-nordic-male-steps.png`, `zzzzzzzzzzzzzzz-nordic-steps.{sprite,combat}.json`, `atlas-layout.json`, `combat-anchors.json` : pas et repères.
- `scripts/register-nordic-steps.py` : mesures et enregistrement ; aucune réécriture des PNG sources.
- `scripts/export-north-refresh.mjs`, `public/validation/vikings/animations/` : planches actuelles, dont les nouveaux pas masculins ; cellules adaptées pour présenter les armes entières.
- `docs/art-archive/nordic-blades-before-approach-review.json`, `docs/references/nordic-steps-review.json` : associations précédentes et contrôle des repères.
- `tests/contact-trial.test.ts`, `contact-preview.spec.ts` : régressions et parcours.
