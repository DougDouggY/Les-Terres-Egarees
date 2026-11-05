# V6 — corrections ciblées avant les chapitres

- Éclair restauré exactement depuis le commit V4 `ee36a2e` : mêmes images, taille, trajectoire diagonale, miroir et timings. Un nuage orageux peint, sur fond transparent, masque son origine ; le nuage est dessiné après l’éclair pour recouvrir la découpe. Seule nouvelle ressource graphique : `storm-cloud-v6.png`.
- Cinématique : suppression du décor extérieur dupliqué, décor cadré sur le canevas, ombres de contact sous les pieds, panneaux inférieurs élargis de 12 % et entièrement visibles. Les proportions, trajectoires et animations des combattants sont conservées.
- Prévision : dimensions, informations et bois/parchemin conservés ; flèches avec tige et pointe, pigments des deux équipes sur leurs parchemins.
- Récapitulatif : la scène est retirée après sa fin complète et la fin des transitions de PV. Un panneau affiche le nom, l’XP et sa barre animée, sans PV. Continuer reste indisponible pendant l’animation. Après validation, un second panneau présente les gains réels de niveau pour tous les participants éligibles.
- XP : le moteur récompensait uniquement ceux qui avaient attaqué. Le défenseur directement visé, s’il survit, est désormais également éligible, même sans possibilité de riposte. Le crédit reste celui existant : 25 EXP sans élimination, bonus d’élimination conservé. Une seule entrée par unité et par affrontement ; aucune XP pour les ennemis, invocations, unités tombées ou spectateurs. Les combats abrégés parce qu’un attaquant est invisible présentent aussi l’XP alliée sans révéler cet attaquant.

Carte, brouillard, initiative, classes, promotions, statistiques, capacités, sauvegardes, tailles tactiques et bonnes animations non modifiés. Aucun atlas d’unité refait. Aucun nouvel audit exhaustif des 89 profils.

## Vérifications ciblées

- Quatre tests de règles : défenseur sans riposte, attribution unique malgré les échanges, défenseur tombé restant hors de combat et conservation exacte de l’appel d’éclair V4.
- Trois scénarios Chromium : prévision/cadrage sur trois tailles d’écran, fin complète → XP → gains de niveau, éclair et nuage dans les deux orientations, combat d’Aventure avec défenseur archer gagnant de l’XP sans riposter.
- Captures de contrôle dans `artifacts/combat-v6/` : éclair, prévision, cadrages, progression et gains de niveau.
- Résultats : 4 tests ciblés de règles réussis, 3 scénarios Chromium réussis ; reprise ciblée de l’éclair après ajustement de la disparition du nuage également réussie.
- `tsc --noEmit`, builds publique/prototype et contrôles de séparation des outils développeur : réussis. Avertissement Vite habituel sur la taille du lot principal, sans erreur de compilation.
- Aucun audit global d’images ni parcours visuel des 89 profils relancé.

Les limites artistiques mineures de classes évoluées signalées en V5 sont reportées, conformément à la demande V6.
