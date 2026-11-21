# Attentes et Lanciers — contrôle des classes de base

## Modifications

Les 22 variantes de base utilisent une respiration continue, légère, autour de leur point d’appui. La pose neutre reste fixe : les anciennes alternances de silhouettes ne produisent plus de pas pendant l’attente. Le même rendu est appelé sur la carte, dans l’introduction et dans l’essai. Les autres actions et les classes avancées ne sont pas remplacées. Les déplacements sur carte respectent aussi la cadence et le nombre réel de poses de leur clip.

L’essai propose « Attente carte / introduction » pour inspecter les vrais sprites de terrain, séparément de la garde de combat. Tous les fichiers nécessaires sont chargés avant l’essai ; vitesse, pause et rejeu restent disponibles.

Lanciers et Lancières partagent une nouvelle planche de 16 poses : attente, garde, quatre pas rapides au sol et huit poses d’estoc. La fente projette le buste, les bras et la lance largement en avant. L’arme plus longue impose une distance visuelle de contact accrue ; aucune portée tactique ni règle de combat ne change. Les défenses existantes sont conservées et les attaques de riposte/agilité réutilisent l’estoc. Aucune pose ne touche les limites de la source.

La comparaison des Vikings affichait la garde de combat, alors que la création affiche la pose de carte. Pour la Lame nordique masculine, ces ressources existantes proviennent de deux planches différentes. L’image principale montre désormais exactement la pose de création/carte ; « Garde de combat » présente séparément l’autre pose. Aucun nouveau dessin de Lame nordique masculine n’a été inventé.

« Femme d’armes » est conservé comme libellé féminin compréhensible ; « homme d’armes » reste le terme historique usuel.

## Ressources conservées et fichiers

Les associations précédentes sont archivées dans `art-archive/before-idle-lance-review.json` et les anciens PNG sont conservés.

Principaux fichiers : `src/sprites/idle-motion.ts`, `resources.ts`, `src/main.ts`, `src/ui/introduction-scene.ts`, `combat-v2.ts`, `contact-preview.ts`, `src/assets/tactical/combat-v4-refinements-lance-v2.png`, `zzzzzzzzzzzzzz-lance-v2.{sprite,combat}.json`, les métadonnées `atlas-layout.json` et `combat-anchors.json`, `scripts/register-lance-v2.py`, les deux scripts de comparaison et leurs rapports publics.

## Vérifications

- 208 tests automatiques réussis : 59 visuels et 149 systèmes.
- Audit navigateur des 22 variantes : la respiration change réellement les pixels du rendu et la ligne d’appui reste stable à un pixel près ; vérification de l’option de carte pour les Hommes d’armes homme/femme, Chasseur masculin et Lames nordiques homme/femme.
- Scénarios de l’essai, les 22 variantes, tirs, magie, soins, parade uniquement avec bouclier, vitesse/pause/rejeu et affichage mobile contrôlés.
- Introductions des deux factions, avec présentation sur téléphone, contrôlées.
- Comparaison de la Lame nordique masculine : l’image principale correspond pixel pour pixel au rendu de sa pose de carte/création ; garde de combat disponible séparément.

Les cartes, recrutements, dialogues, dégâts et données de sauvegarde ne sont pas modifiés. La validation visuelle finale en partie reste celle du joueur.
