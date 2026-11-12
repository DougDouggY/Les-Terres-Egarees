# Assemblages des propositions illustrées

Accès en développement ou build prototype : **Tests de combat → Tester les textures assemblées**.
Les cartes complètes et leurs données ne sont pas modifiées par cet écran.

Deux fragments libres de 10 × 8 cases servent uniquement à valider le rendu :

- Pierre : dalles bleues unifiées, angle sud-est de mur, face verticale,
  pilier et herbe extérieure existante. Une option affiche un échantillon de toiture.
- Navire : pont, bastingage avec ouverture, trois grosses planches continues
  et eau. Ce fragment n'est pas une nouvelle disposition du chapitre 9.

Le moteur découpe les nouveaux atlas illustrés, puis compose les matériaux
case par case ; les planches traversent plusieurs cases d'un seul tenant.
Ce ne sont pas des images de scène fixes. La navigation reprend `gridPath`.
La grille logique reste de 32 unités ; le buffer de présentation utilise 96 pixels
par case afin de voir les détails, avec zoom 50–150 %. Les répétitions de dalles restent visibles dans ces échantillons de validation.
La mer utilise un raccord périodique par fusion des bords opposés, sans miroir.
Les atlas sources ne sont pas considérés comme un remplacement final déjà validé.

Les murs, piliers, bastingages et l'eau bloquent le repère ; le sol et les planches
sont praticables. Grille, collisions, zoom et exports sont disponibles.
L'aperçu ne lit ni n'écrit les sauvegardes de campagne.

Fichiers de cette étape :

- `public/assets/material-tests/castle-atlas.png`, `boarding-atlas.png` : atlas
  issus des propositions illustrées, préparés pour cet essai. Les originaux restent
  dans `/workspace/generated_images/`.
- `src/dev/material-samples.ts` : fragments et navigation.
- `src/dev/material-renderer.ts` : rectangles sources et assemblage des textures.
- `src/dev/material-lab.ts`, `src/dev/material-lab.css` : écran indépendant.
- `src/dev/test-hub.ts`, `src/main.ts` : accès à cet écran.
- `scripts/material-tests-audit.mjs` : validation navigateur et exports.
- `artifacts/material-tests/` : deux assemblages, variante de toiture et capture UI.

Validation exécutée : TypeScript, build public + contrôle d'exclusion des outils,
build prototype + contrôle du contenu, audit Chromium. L'audit vérifie le chargement
des atlas, les trois exports PNG, les chemins sur sol/planches, les obstacles,
les aides, le zoom, le retour aux tests, l'absence d'erreur navigateur et la
préservation du stockage. Les suites de campagne n'ont pas été relancées pour
cet ajout isolé de validation artistique.

Branche : `work`. Aucun commit, push ou déploiement effectué.


## Révision après retour visuel

Le mini-test emploie `public/assets/material-tests/corrections-atlas.png` pour un
pont moins contrasté, une mer plus sobre et deux bordures nord-sud. Le mur droit
et le bastingage remplissent une case entière et montrent leur face sombre vers
l'intérieur. Le bastingage est interrompu uniquement sur les deux rangées de
passerelle. Le mur du bas, l'herbe, les piliers et le sprite des planches de
passerelle sont conservés. Le sol du château est uniformément bleu.

L'audit Chromium vérifie aussi l'égalité exacte des pixels des quatre bords de
la texture d'eau périodique, le sol uniforme et toutes les cases du bastingage.
Les planches de passerelle restent issues du même atlas et du même rectangle
source. Ces corrections ne concernent que les mini-tests.

### Révision : murs latéraux et barrière fine

Le mur droit du mini-test reprend maintenant uniquement la pierre claire de sa
partie droite sur toute la case. Le sol bleu, le pilier, le mur inférieur et
l'herbe sont conservés.

La barrière du mini-test naval occupe le quart gauche de chaque case de bord,
côté pont. Les trois quarts droits montrent exactement le même motif d'eau,
avec la même origine spatiale que les cases de mer voisines. Toute cette case
reste bloquée, sauf aux rangées de passerelle. Le pont, l'eau et les planches de
passerelle validés sont conservés. L'audit compare les pixels des trois quarts
extérieurs à un rendu de mer seule : aucune différence n'est admise.

### Révision : porte, toiture, mobilier et accessoires navals

Le fragment de château a une cloison sur la ligne 3, une porte dans la quatrième
colonne, un coffre dans la salle au-dessus, et un tapis de 3 × 2 cases en bas.
Le pilier validé reste en place. L'option de toiture couvre seulement les deux
rangées supérieures, jamais la zone du pilier. Le bouton Ouvrir/Fermer la porte
permet de tester l'accès ; ouvrir découvre la salle haute. Le toit compose un
fond opaque avant ses ardoises, empêchant le coffre de transparaître.
Le coffre utilise `public/assets/material-tests/chest.png`, et la porte/le tapis
reprennent les éléments de `castle-details.png` issus de la proposition visuelle.

La passerelle navale commence désormais une case plus à gauche, dans le pont
(colonne 6 du mini-test). Le quart de case de barrière reçoit un couronnement
éclairé, une face sombre et des potelets, sans déborder sur les trois quarts
d'eau. Un mât de 2 × 2 cases, une caisse et un tonneau sont présents et bloquent
les déplacements. Les planches de passerelle, le pont, la mer et les éléments
validés du château sont conservés.

L'audit vérifie l'ouverture/fermeture, le chemin vers la salle haute, le coffre
et les accessoires solides, le tapis praticable, la continuité de la passerelle
sur le pont et l'opacité du toit. Il produit quatre exports (château sans toit,
avec toit, porte ouverte et bateau). Les aperçus versionnés `*-v4.png` permettent
de les comparer aux versions antérieures.

### Révision : porte liée au toit et eau sous la passerelle

Retirer le toit ouvre maintenant la porte et retire entièrement son sprite.
Fermer la porte rétablit le toit de la salle haute. Les deux bandes de pierre
verticales ajoutées aux côtés de la porte sont supprimées : les murs voisins
conservent leur rendu horizontal habituel.

Sous la passerelle, la case d'ancien bastingage possède le même fond mixte que
la côte : un quart d'appui côté pont et trois quarts de mer, puis uniquement de
la mer dans les cases suivantes. Le sprite des planches n'est pas modifié.
L'audit efface uniquement les planches dans une image de test et compare chaque
pixel seaward au motif de mer de référence, ce qui détecte le retour d'un fond
de pont au mauvais endroit. La taille de la caisse est conservée.
