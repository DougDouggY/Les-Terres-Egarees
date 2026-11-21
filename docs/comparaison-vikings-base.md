# Comparaison des classes vikings de base

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
