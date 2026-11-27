# Chapitre II — Comparaison du campement militaire

## Périmètre et dernière décision

Cette reprise concerne uniquement **Le petit campement**. L’ancienne version reste disponible et reste celle affichée par défaut ; elle n’est pas remplacée sans validation. Les autres terrains, le scénario, les sauvegardes et les mécaniques de combat ne sont pas modifiés.

La demande ultérieure du joueur remplace la consigne initiale d’intérieurs accessibles pour cette nouvelle version : **les bâtiments restent fermés et se visitent depuis leur entrée extérieure**, comme les ruines du prologue. Les intérieurs et les toits interactifs de l’ancienne version sont conservés uniquement pour la comparaison.

Les récompenses, les prisonniers, la destruction ou la sécurisation des bâtiments et les éventuelles sorties d’ennemis ne sont pas définis. Le bouton **Visiter · aperçu** montre le lieu concerné et son principe d’accès ; il ne donne aucun objet et ne déclenche aucun événement de campagne.

## Accès

Accueil → **Carte du chapitre 2** → **Version du camp** :

- **Originale · intérieurs** : les quatre bâtiments précédents et leurs fonctions existantes.
- **Militaire · visites extérieures** : la nouvelle composition, indépendante et non persistée.

Le changement de version réinitialise ses manipulations de test. La grille, le glissement, le zoom à la molette et le pincement tactile restent disponibles. Toucher un bâtiment trace l’accès jusqu’au point de visite devant sa porte ; aucune unité ne marche sur son toit.

## Composition et échelle

La variante mesure **20 × 24 cases**, avec des cases du monde de 32 pixels et un rendu de 64 pixels par case. L’échelle rapprochée est conservée : arbres individuels d’une case, buissons et stockage compacts, bâtiments complets de **2 × 2 ou 3 × 2 cases**. Aucune tuile de forêt régionale ou de montagne miniature n’est utilisée.

La construction de Serafew dans FE8 sert de référence aux secteurs, passages et possibilités de contournement, sans reprendre sa disposition exacte, ses couleurs ou ses illustrations.

Les six bâtiments sont des illustrations complètes et indépendantes, comme le bloc des ruines du prologue : toit en volume, façade, fenêtres, cheminée et porte. Ils ne sont plus assemblés avec une grande surface de toit répétée. Trois bâtiments occupent 3 × 2 cases (grande caserne, entrepôt, prison) et trois occupent 2 × 2 cases (officiers, petite caserne, intendance). Les illustrations sont cadrées dans ces emprises sans étirer leurs proportions.

Six bâtiments décalés organisent le camp : grande caserne, petite caserne, entrepôt, prison, logement d’officiers et intendance. Une cour irrégulière avec un puits relie les secteurs. Quelques murs bas et clôtures délimitent les espaces sans constituer une enceinte de forteresse. Des passages resserrés alternent avec la cour, les ruelles et des dégagements aux limites du terrain.

Les chemins utilisent les textures et le masque de raccord du camp existant. Le stockage, les charrettes, l’armement, le bois, les arbres et les buissons sont des objets distincts de la couche de sol. Les buissons restent traversables avec leur terrain de couverture ; les arbres, les murs et le stockage bloquent les déplacements. L’accès de référence utilisé pour tracer les chemins est un repère de test, pas une position de déploiement définitive.

## Ressources et fichiers

- `src/data/kingdom-camp-military.ts` : composition autonome, collisions, portes et points de visite.
- `src/ui/kingdom-camp-military-renderer.ts` : rendu rapproché et objets séparés.
- `src/ui/kingdom-camp.ts` : comparaison des deux versions, visite d’aperçu et caméra commune.
- `src/ui/kingdom-camp-renderer.ts` : masque de chemin paramétrable ; ses valeurs par défaut conservent l’ancien rendu.
- `public/assets/kingdom-camp/military-life.png` : atlas transparent 4 × 4 de 1024 × 1024 pixels. Seuls les éléments extérieurs sont utilisés dans cette variante.
- `scripts/pack-camp-military.mjs` : découpage de la planche de décor sans déformation des proportions.
- `public/assets/kingdom-camp/compact-buildings.png`, `compact-buildings/` : atlas transparent et six bâtiments individuels, avec dimensions et cadres dans `frames.json`.
- `scripts/pack-compact-camp-buildings.mjs` : cadrages explicites des six silhouettes ; 128 pixels natifs par case dans les PNG individuels.
- `tests/camp-military.spec.ts`, `tests/chapter2-integration.test.ts` et configuration Playwright : vérifications.

Les matériaux de bâtiment et de mur déjà présents sont réutilisés sans modifier leurs fichiers. Source originale de la nouvelle planche : `/workspace/generated_images/exec-3a42f439-2678-450d-b0fc-d3f887bb5078.png`.

Source originale des bâtiments compacts : `/workspace/generated_images/exec-6d1fda74-9465-421e-ba1d-ed4405e6e1ad.png`. Les cadrages sont propres à cette planche ; ils ne supposent pas que la génération a produit six cases identiques.

## Vérifications

Les tests de données vérifient les six emprises fermées, l’absence de chevauchement entre bâtiments et objets, les accès de visite, les connexions des dégagements et un contournement après blocage du passage central. Ils vérifient également que l’ancienne carte n’est pas modifiée.

Les tests navigateur couvrent la comparaison, les visites sans ouverture, la conservation des sauvegardes, les commandes de caméra et le pincement réel sur téléphone. L’ancienne version est vérifiée séparément, y compris l’ouverture et la fermeture de ses bâtiments. Les parcours narratifs du chapitre II et le lancement compilé sont contrôlés séparément. Aucun résultat de combat ni événement de visite futur n’est revendiqué.

Bilan de cette version : 247 tests automatisés réussis et 13 parcours navigateur vérifiés (2 pour la variante, 3 pour l’ancien camp, 2 pour les transitions narratives, 6 pour le lancement compilé). La reprise compacte vérifie aussi les emprises 2 × 2 / 3 × 2, le cadrage des six PNG et leurs dimensions natives, ainsi que les nouveaux accès après réduction du terrain.

## Retouche des murets — 27 novembre 2026

Les anciens morceaux de façades étirés sont remplacés, dans cette variante uniquement, par des murets bas à dessus continu. Les cases voisines déterminent les raccords, angles et extrémités. Les dalles de couverture suivent l’axe du muret et un bloc de couverture ferme chaque angle. Une courte face sud et une ombre discrète donnent le relief, dans l’esprit de Serafew tout en conservant les matériaux du jeu. Les clôtures sont également reliées par des traverses continues.

Les emprises, collisions, ouvertures, bâtiments et points de visite restent inchangés. `src/rendering/camp-low-walls.ts` compose ce rendu avec les textures existantes ; aucune nouvelle illustration n’est nécessaire. Vérifications de cette retouche : deux parcours navigateur ordinateur/téléphone et un contrôle des raccords et ouvertures (trois tests réussis), compilation et contrôle des ressources du prototype.
