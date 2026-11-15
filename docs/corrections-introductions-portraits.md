# Ajustements des introductions, portraits et fiches

## Corrections ciblées

- Les aperçus de création utilisent la hauteur du corps de la pose affichée et une ligne de sol commune. Le Pilleur ne paraît plus plus bas que les autres classes. Les fichiers de sprites restent inchangés.
- Sélecteur de visage : ligne « flèche gauche — Valider — flèche droite » au-dessus du portrait, portrait ancré en bas dans le coin prévu. Le bouton « Retour aux paramètres » a été retiré des scènes.
- Le portrait du héros après validation est réellement contenu à la même échelle que les portraits narratifs. Le conteneur ne laisse plus la taille intrinsèque de l'image agrandir ou déborder la zone ; tête, épaules et haut du buste sont visibles. Les identités interactives suivent le rapport d'aspect du PNG et sont alignées sur leur coin.
- Les orientations et déplacements tactiques des introductions, les figurants, les décors RRR/RRTT et les événements restent ceux déjà validés.
- L'introduction Chevalier réutilise `Mist`, le brouillard du prologue, avec une visibilité locale de présentation et une intensité réduite. Il est dessiné sous l'interface, sans modifier la visibilité de campagne ou masquer les commandes.
- Le menu des compagnons est compact : tous les candidats et Valider sont visibles simultanément, sans ascenseur. Les visages restent cachés jusqu'à confirmation ; les règles de recrutement ne changent pas.
- Lors de l'arrivée du deuxième compagnon Viking, le premier portrait reste éclairé. Il devient sombre seulement lorsque le second apparaît dans le dialogue. Les portraits arrière restent à la même ligne de base et légèrement décalés.
- Les portraits narratifs conservent leur hauteur de référence et se rapprochent des coins inférieurs. Les noms restent absents des fenêtres de texte.
- Une infobulle parchemin affiche uniquement le nom au survol, au focus clavier ou pendant deux secondes après un appui tactile. La sortie de la souris la masque. Consulter une identité n'avance pas la conversation. Le survol des parties exposées des portraits superposés est testé.
- Les fonds ajoutés aux cadres des visages sont supprimés : la transparence laisse voir directement le parchemin existant de la fiche.
- La colonne d'identité des fiches tient sans molette. Portrait, nom, classe et statistiques sont compacts ; le nom adapte sa taille à la largeur disponible, y compris pour Sans-repos et les noms longs.

## Guerrière du Nord : animation d'attente sur la carte tactique

La ressource actuelle n'offre qu'une pose d'attente pour la version féminine de cette classe. Elle bénéficie maintenant du léger mouvement d'attente déjà utilisé pour les ressources à pose unique : oscillation du haut du corps, pieds stables. Aucun dessin ou frame d'attaque n'est fabriqué ou emprunté pour simuler son attente. Ce traitement ne s'applique ni aux déplacements, ni aux attaques, ni à une éventuelle future ressource possédant déjà plusieurs poses d'attente.

Un test charge une vraie partie tactique de test avec cette unité, cadre son emplacement sur le canvas de la carte et vérifie que ses pixels changent en restant en attente.

## Fichiers principaux

- `src/ui/introduction-scene.ts` : commandes, brouillard de présentation et synchronisation des interlocuteurs.
- `src/ui/portraits.ts`, `src/ui/portrait-mask.ts` : identité interactive, nom temporaire, proportions.
- `src/ui/chapter-dialogue.ts`, `src/main.ts` : intégration des noms sans progression accidentelle.
- `src/ui/creator.ts` : alignement des aperçus de classes.
- `src/sprites/display-scale.ts` : attente de la Guerrière du Nord à pose unique.
- `src/style.css` : cadrage, coins, menus sans défilement, transparence et fiches.
- `tests/portrait-refinements.spec.ts`, `playwright.refinements.config.ts`, `tests/prologue-v10.test.ts` : vérifications ajoutées.

## Vérifications

- `npm test` : **183 tests réussis**, dont la non-application de l'oscillation aux attaques et déplacements.
- `npx playwright test --config=playwright.refinements.config.ts` : **6 tests réussis**. Introductions complètes sur 1917×1078, 390×844 et 844×390 ; portraits V10 et C09 correspondant aux cas des captures ; commandes au-dessus et portraits contenus ; recrutement sans molette et éclairage synchronisé ; noms au survol, sur portraits superposés et à l'appui tactile ; fiches sans défilement, y compris Sans-repos et nom long ; aperçus alignés ; changement effectif de pixels de la Guerrière sur la carte tactique.
- `npx playwright test --config=playwright.corrections.config.ts` : **9 tests de non-régression réussis**, comprenant les sauvegardes manuelles, les portraits et les deux créations jusqu'au prologue.
- Build TypeScript/Vite et contrôle de la version publique réussis.

Les sauvegardes, les règles de combat, les textes narratifs et les fichiers graphiques d'origine ne sont pas modifiés. L'appréciation de l'intensité du brouillard et de la petite oscillation d'attente reste à confirmer visuellement par le joueur ; aucun nouveau cycle dessiné d'attente n'est fourni dans les ressources.
