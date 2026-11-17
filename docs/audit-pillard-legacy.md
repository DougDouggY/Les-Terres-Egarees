# Pillard hache-bouclier et ressources legacy

Audit du 17 novembre 2026, après fusion des descriptions `*.sprite.json` puis application des remplacements `*.combat.json`, comme dans le jeu.

## Le montage fourni n'est pas une planche exhaustive à remplacer telle quelle

Il contient des historiques et des doublons : les 16 entrées legacy, les 7 entrées team-sample, les 8 attaques combat-extra et les 23 entrées pair-reference ne sont pas 54 poses uniques utilisées ensemble.

Pour le Pillard masculin hache-bouclier, le profil de carte utilise `team-sample.png` pour l'attente (2 poses) et le déplacement (2 poses). Le combat final utilise :

| Animation               | Source active                    | Poses référencées |
| ----------------------- | -------------------------------- | ----------------- |
| Attente de combat       | combat-pair-reference-v2.png     | 2                 |
| Déplacement de combat   | combat-v3-motion1.png            | 4                 |
| Attaque                 | combat-pair-reference-v2.png     | 8                 |
| Riposte                 | attaque réutilisée par le moteur | 8                 |
| Variante seconde frappe | combat-pair-reference-v2.png     | 6                 |
| Parade                  | combat-pair-reference-v2.png     | 4                 |
| Dégâts                  | combat-v4-fixes.png              | 3                 |
| Mort                    | team-sample-combat.png           | 1                 |
| Esquive                 | dessin cohérent manquant         | 0                 |

Les deux sources de marche de combat et de dégâts ci-dessus ne sont pas représentées dans le montage. L'esquive legacy n'est pas un remplacement acceptable : elle appartient à l'ancien personnage et est écartée des combats. Une nouvelle planche complète doit prévoir une esquive cohérente. Un critique distinct n'est pas nécessaire au fonctionnement : le moteur peut réutiliser l'attaque ; une animation spécifique est possible. Une pose de mort unique fonctionne, une chute animée est une amélioration visuelle possible.

Pour les futurs remplacements : fournir les images originales, pas uniquement ce montage documentaire, avec une grille connue, l'ordre des animations et leurs poses, les pieds stables, une marge pour les armes et un fond transparent. La cohérence du personnage et des proportions doit être conservée entre attente, marche, attaque, défense, dégâts et mort. Les portraits de discussion sont indépendants.

## Peut-on supprimer legacy ?

`legacy.sprite.json` est actuellement chargé dans le catalogue de production par le glob de `src/sprites/resources.ts` : il n'est donc pas réservé aux tests.

Après toutes les surcharges, sur les 89 profils configurés (y compris évolutions et états), seules ces références vers les dessins legacy subsistent dans le catalogue brut :

- `raider:male:axe-shield:default` : `evade`.
- `man_at_arms:female:sword-shield:default` : `evade` et `block`.

Le rendu de combat final ne reprend pas ces anciennes poses. Aucun profil actuel n'est fourni exclusivement par le fichier legacy : le catalogue reste à 89 profils sans celui-ci. Aucune évolution actuellement programmée ne dépend exclusivement de ces anciennes planches. Cela ne préjuge pas des classes qui seraient ajoutées plus tard.

Un nettoyage est donc envisageable, en supprimant simultanément les références résiduelles, la règle CSS historique `.sprite-portrait`, les tests historiques qui attendent explicitement les anciennes ressources, le descripteur et les deux anciennes images publiques. Ces deux PNG pèsent environ 1,1 Mio au total. Ne pas confondre `team-sample`, encore actif pour la carte et la mort du Pillard, avec `legacy`.

Aucune ressource legacy n'a été supprimée dans cette modification.

## Groupes d'accueil

Les acteurs décoratifs de l'introduction sont désormais :

- Chevaliers : homme d'armes, lancier, arbalétrier.
- Vikings : Pillard, guerrier du Nord, chasseur.

Ils restent locaux à la présentation : aucun changement de recrutement, de sauvegarde, de combat, de dialogue ou d'équipe jouable.
