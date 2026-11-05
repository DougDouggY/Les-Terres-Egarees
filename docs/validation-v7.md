# V7 — Correctifs visuels et chapitre I

## Changements

- Prévision bois/parchemin conservée : pigments irréguliers nettement étendus sur les deux papiers, avec les couleurs réelles des équipes. Dimensions et calculs inchangés.
- Taille anatomique normalisée uniquement dans la barre d’initiative, notamment pour Chasseur et Chasseresse. Bouton œil et rétraction conservés.
- Champ de bataille élargi horizontalement : décor, canvas et panneaux. Les personnages conservent leur échelle et les distances de leur chorégraphie ; le cadrage s’adapte au format de l’écran sans étirement.
- Fin de cinématique → carte tactique → expérience animée → Continuer → montée de niveau éventuelle. Aucune activation suivante pendant le récapitulatif.
- Nuage orageux doublé autour du même centre ; ressource, éclair V4 validé, trajectoire et impacts conservés.

## Chapitre I

Les nouvelles aventures commencent par les deux conversations après la tempête, avec les unités réellement choisies. Chaque expédition découvre ensuite les ruines indépendamment au cours de sa progression. La caméra révèle temporairement les neuf cases du village, revient au groupe et laisse une lueur directionnelle. Cette présentation ne modifie pas l’exploration enregistrée.

La rencontre attend qu’un survivant de chaque groupe soit à proximité des ruines et que chacun ait reçu sa découverte. Le sauvetage utilise des copies visuelles temporaires des sprites existants : apparition du Sans-Repos, intervention viking, impact et disparition. Aucun dégât ni recrutement scénarisé n’est ajouté au moteur de combat. La fusion conserve les ennemis et renforts existants ainsi que le cycle d’initiative en cours.

La victoire déclenche l’alliance, immédiatement suivie de la voix inconnue et de la sorcière dans la même scène. Le départ mène au bilan de fin du chapitre ; la sorcière reste un guide narratif. Aucun chapitre II ou second combat n’est créé.

Les dialogues affichent le nom réel du survivant, du texte progressif et un bouton Suivant, avec Entrée/Espace. Les actions tactiques sont suspendues durant les scènes. Chaque réplique est sauvegardée automatiquement. Les anciennes sauvegardes en cours adoptent le stade narratif approprié ; les bilans déjà terminés restent terminés.

## Vérifications ciblées

- Six tests logiques du chapitre : effectifs 3/2 et factions inversées, découvertes privées, attente des deux groupes, fusion unique, victoire et guide sans recrutement, reprise de sauvegarde et migration.
- Tests navigateur : arrivées et clavier, reprise en pleine conversation, découverte déclenchée après déplacement réel et activation conservée, neuf cases temporaires, sauvetage et protection contre une interruption, alliance/sorcière sans remplacement de la scène, départ et reprise du bilan, tailles Chasseur/Chasseresse dans la barre.
- Combat réel : prévision, champ de bataille à 1440×1000, 1024×600, 844×390 et 390×844, proportions sans étirement, absence de défilement, expérience sur la carte puis gains de niveau. Capture de la foudre dans les deux orientations.
- Tests V6 directement concernés : XP des participants, défenseur sans riposte, absence de résurrection, conservation exacte des appels et de la trajectoire de l’éclair.
- Tests existants d’initiative et de champs tactiques ; compilation TypeScript et constructions publique/prototype, vérification des ressources livrées.
- Captures inspectées dans `artifacts/chapter1-v7/` : prévision, combat large, découverte, dialogues, sorcière, expérience et niveau.

## Limites volontaires

Portraits provisoires provenant des sprites existants et « ??? » pour la sorcière. Le registre de portraits est séparé des dialogues pour recevoir les futurs portraits/animations. Le sauvetage et le départ sont une mise en scène, sans déplacement permanent des unités de la sauvegarde. Les futures scènes, le prochain lieu et le deuxième combat restent à définir. Aucun nouvel atlas ni audit exhaustif des classes évoluées n’a été réalisé pour cette mise à jour ciblée.
