# Comparaison des Chevaliers évolués

Page : `validation/chevaliers-evolues/index.html`, accessible depuis « Essai des animations » → « Comparer les Chevaliers évolués » et par lien direct sur téléphone.

Onze classes actuelles : Chevalier de la garde, Cavalier, Garde royal, Lancier monté, Porte-étendard, Rôdeur, Arbalétrier à pavois, Duelliste, Exécuteur, Nécromancien et Archimage. Trente-deux variantes et états sont présentés, hommes et femmes. Trois classes de base de référence (Lancier H/F et Arbalétrier H) complètent la comparaison.

Les 105 captures proviennent des ressources de carte et de combat réellement résolues par le jeu. La bannière portée est associée à la lance-bannière, la bannière plantée à l’épée, comme dans le système existant. Les pavois présentent les états normal et fortifié. Les cavaliers conservent leur échelle de combat montée. Les silhouettes ne sont pas étirées ; les images ont un fond transparent et des marges conservant les armes et les pieds.

Filtres par classe/sexe, garde, pose d’impact ou de soin, miniature de carte et agrandissement tactile sont disponibles. Les apparences partagées et les substitutions signalées par les profils sont indiquées. Cette page sert à examiner les skins actuels avant toute modification ; elle ne valide pas les animations. Aucun sprite de Chevalier, recrutement, statistique ou sauvegarde n’est remplacé.

Régénération : démarrer Vite au port 5173, puis `node scripts/compare-viking-advanced.mjs --faction=knight`. Sans cet argument, le script conserve son comportement de comparaison des Vikings. Le manifeste trace les classes, équipements, états et sources effectivement utilisés.

Contrôles : 229 tests automatisés et huit essais navigateur réussis (comparaisons Vikings/Chevaliers à 390 et 1280 pixels, lecteur des nouvelles apparences). Les 105 captures ont une silhouette non vide et sans contact avec les bords. Compilation et contrôle du prototype réussis. Aucune modification des sauvegardes pendant les comparaisons.

## Animations à reprendre après validation des skins

- Garde royal, Lancier monté et Porte-étendard H/F : remplacer le coup de lance par un estoc réaliste, selon le modèle retenu pour les Lanciers de base.
- Duelliste H/F : garder les deux épées visibles et leurs positions cohérentes pendant les frappes.

Ces corrections sont consignées, sans modification des animations à cette étape.
