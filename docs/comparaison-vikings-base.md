# Comparaison des classes vikings de base

Les sections initiales documentent le constat avant harmonisation. La dernière section décrit les ressources désormais intégrées et leurs vérifications.

La page `public/validation/vikings/index.html`, accessible depuis « Comparer les gabarits » dans l’essai de combat, présente les cinq classes de base : Guerrier du Nord, Pillard, Lame nordique, Chasseur et Chaman. Les deux équipements du Pillard donnent six paires homme/femme, soit douze variantes actuelles. La nouvelle Pillarde hache/bouclier est présentée séparément comme proposition réservée à l’essai.

## Constats visuels

- Le Guerrier du Nord masculin et le Pillard masculin ont des silhouettes plus massives que la Lame nordique. L’équipement et la fourrure contribuent à cette différence ; elle reste plausible pour leur rôle.
- La Lame nordique forme une paire homme/femme assez cohérente. La Pillarde proposée s’en rapproche par son gabarit plus élancé.
- La Pillarde à l’épée actuelle manque nettement de définition. Les niveaux de netteté des différentes classes restent inégaux, même à hauteur de référence identique. Une normalisation de taille seule ne règle pas ce problème.
- Les Chasseurs sont plus fins, ce qui convient à leur équipement. Les Chamans ont une silhouette distincte et un bâton qui dépasse le corps : leur hauteur totale ne doit pas servir à comparer les anatomies.
- Sur le terrain tactique, les différences de gabarit sont moins prononcées. Les apparences de carte peuvent employer une autre planche que celles de combat : vérifier les deux rendus avant toute correction artistique.

Les largeurs affichées incluent les armes, les capes et les boucliers : ce ne sont pas des mesures de corpulence.

## Méthode et limites

`scripts/compare-viking-base.mjs` extrait les variantes depuis les classes et équipements initiaux du moteur. Les grandes vues utilisent une hauteur de référence commune de 176 pixels, sans déformation. La mise en situation reprend le vrai terrain du prologue et la méthode de rendu de carte (cases de 32 pixels, cadre d’infanterie de 38 pixels). Douze unités de comparaison sont placées sur des cases praticables, sans modifier une équipe ni une sauvegarde. Le manifeste documente les sources et les coordonnées.

Le sélecteur de carte remplace seulement la Pillarde hache/bouclier par la proposition, à coordonnées identiques. Zoom ×1, ×2 et ×3. Cette planche compare la pose d’attente ; elle ne valide pas toutes les animations. Aucun sprite, classe, carte de campagne ou mécanisme de combat n’a été modifié.

## Vérifications réalisées

Export des douze variantes réussi ; carte et stockage local inchangés pendant l’export. Vérification navigateur : douze variantes présentes, images chargées, bascule actuel/proposition sans double affichage, zoom ×3 et affichage à largeur mobile de 390 pixels.

## Mise à jour après validation

La Pillarde hache/bouclier est intégrée en campagne. Les cinq variantes demandées ont de nouvelles planches : H1 (Guerrier du Nord), H2 et H3 (Pillard hache/épée), F3 (Pillarde épée) et F5 (Chasseuse). F2 reprend exactement la source validée. Les autres classes restent inchangées.

La comparaison antérieure est conservée dans `vikings-base-avant-gabarits.png`, son manifeste et son image de terrain. La page principale présente maintenant les ressources après harmonisation et une bascule avant/après de la carte, à coordonnées et zoom identiques. Un lien ouvre les six fiches de 26 poses. Les constats visuels plus haut décrivent l’état initial ; la Pillarde à l’épée floue a depuis été remplacée.

Vérifications après intégration : 200 tests automatisés réussis (51 visuels et 149 systèmes), compilation publique, contrôle de séparation de la version publique, navigation navigateur des six variantes, sources chargées, tir de la Chasseuse sans déplacement, stockage local inchangé et comparaison à largeur mobile. Les six variantes ont aussi été chargées et dessinées dans `CombatSceneV2`, de l’approche à la fin du combat. Les tests portent sur le rendu et les liaisons de ressources ; l’acceptation artistique reste visible dans les comparaisons.

## Corrections après essai

La planche `couleurs-equipes.png` compare les six variantes en bleu et en rose, avec les nuances de leurs tissus correctement prises en compte. Les fiches d’animations du Guerrier du Nord et de la Chasseuse n’affichent plus de parade (23 poses utilisées). Les distances au contact sont recalculées à l’échelle réelle ; l’audit chiffré figure dans `docs/references/north-contact-audit.json`. Aucun dessin source n’est modifié dans ce correctif.
