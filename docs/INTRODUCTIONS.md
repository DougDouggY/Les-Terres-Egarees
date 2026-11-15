# Introductions animées et choix des compagnons

## Décors fournis

Les deux PNG du ZIP `rrr.zip` sont intégrés sans régénération, conversion ni retouche :

| Faction | Fichier du ZIP | Ressource | Dimensions |
| --- | --- | --- | --- |
| Chevaliers | rrr.png | public/assets/introduction/knight-clearing-rrr.png | 1374 × 1145 |
| Vikings | rrtt.png | public/assets/introduction/viking-drakkar-rrtt.png | 1536 × 1024 |

Les tests vérifient leurs empreintes SHA-256 et dimensions. Le décor reste une image indépendante du canevas transparent des personnages. Le cadrage utilise la totalité de l’image, sans étirement ni découpe du drakkar ; des marges peuvent donc apparaître sur les écrans de proportions différentes.

## Parcours

Le choix des deux factions et les paramètres existants sont conservés. Le prénom reçoit une majuscule initiale sans changer la suite du nom, ses accents, sa casse ou ses traits d’union. Les libellés deviennent « Vous », « Continuer » et « Joueur » ; les identifiants internes restent inchangés.

Chaque joueur traverse ensuite sa propre introduction plein écran :

1. Le héros rejoint automatiquement l’accueil dans la clairière.
2. Le sprite générique de sa faction dit « Approche, enlève ta capuche. » dans une fenêtre en haut à gauche, sans nom ni portrait d’accueil.
3. Après cette réplique, un portrait importé apparaît au centre droit. Les flèches bouclent dans les visages compatibles et Valider confirme le choix. Aucun nom ou identifiant de portrait n’est visible.
4. Le carrousel se ferme. L’accueil reprend la phrase déjà prévue : « Prêt pour le grand voyage à l'ouest ? » (accord féminin conservé) côté Viking, phrase exacte du convoi côté Chevalier. La réplique d’invitation au choix des compagnons est conservée.
5. Le héros rejoint la gauche et se tourne vers la droite. L’accueil reste sur le terrain. Le menu à droite ne montre que les noms, classes et sexes des candidats existants.
6. Un compagnon chevalier ou deux Vikings distincts sont confirmés. Le nombre requis et la règle existante de remplacement du plus ancien choix sont inchangés.
7. Après confirmation seulement, les compagnons reçoivent leur portrait et arrivent successivement sur la droite du héros. Chacun prononce une courte phrase d’introduction correspondant à sa biographie. Les deux portraits vikings restent distincts : le locuteur est en avant, l’interlocuteur précédent atténué, et leurs places visuelles s’inversent.
8. La scène s’efface. L’autre joueur crée son groupe s’il ne l’a pas encore fait ; lorsque les deux groupes sont prêts, le prologue existant démarre par son chemin de lancement habituel.

Ces scènes n’ajoutent aucune unité à la campagne. Les héros, classes, armes initiales, statistiques, compagnons et événements du prologue sont produits par le système existant. Les nouvelles phrases de présentation concernent uniquement l’introduction ; aucune réplique des chapitres n’est remplacée.

## Portraits et sauvegardes

Aucun candidat non confirmé n’a de portrait ou de miniature dans le menu. Les introductions ne calculent les portraits des compagnons qu’à la confirmation. Les nouvelles parties réservent uniquement les deux héros et les compagnons effectivement recrutés ; le reste du catalogue reste disponible pour des rencontres futures.

Les portraits montrés dans l’introduction correspondent exactement aux identifiants ensuite enregistrés dans le registre de la campagne. Les deux factions utilisent des réserves distinctes : le choix ultérieur de l’autre héros ne change pas une identité déjà présentée. Les réservations des sauvegardes existantes, y compris celles d’anciens compagnons absents, restent conservées. Les portraits prédéfinis ne changent pas.

Les portraits narratifs existants ne sont pas refaits. Leurs marges latérales sont ajustées sur ordinateur et téléphone, avec proportions et épaules conservées.

## Animation et limite connue

Les sprites de carte disponibles sont réutilisés avec leurs animations ; un déplacement reste lisible avec la pose disponible lorsqu’une classe n’a pas de clip de marche. Aucune variante d’introduction encapuchonnée n’est déclarée dans le catalogue actuel : les sprites existants sont donc utilisés, sans fabriquer une nouvelle apparence.

Le fond est statique, les acteurs sont animés sur une couche séparée ; les scènes sont nettoyées à la sortie. La préférence de réduction des animations est respectée. Aucun générateur d’images n’est utilisé.

## Fichiers concernés

- `src/ui/introduction-scene.ts`, `src/ui/introduction-layout.ts` : scènes, animation, menus masqués, présentations et cadrage.
- `src/ui/creator.ts`, `src/game/creation.ts`, `src/main.ts` : paramètres, prénom, transitions et réutilisation du lancement de campagne.
- `src/game/portraits.ts` : attribution uniquement aux compagnons confirmés, sans modifier les associations sauvegardées.
- `src/data/companions.ts` : courtes phrases propres à l’introduction ; liste, classes et règles existantes conservées.
- `src/style.css` : couches, menu à droite, fenêtres et marges de portraits.
- `public/assets/introduction/` : les deux PNG originaux.
- `tests/introduction.test.ts`, `tests/introduction.spec.ts`, `tests/introduction-flow.ts`, `tests/portraits.test.ts`, `tests/portraits.spec.ts`, `playwright.introduction.config.ts`, `package.json` : vérifications.

## Vérifications effectuées

- `npm test` : 177 tests réussis, dont intégrité des PNG, cadrage, majuscules, allocation différée et conservation des anciennes réservations.
- `playwright.portraits.config.ts` : 3 scénarios, dont parcours intégral Viking puis Chevalier avec arrivées, visages, candidats cachés, présentations, prologue et reprise de sauvegarde.
- `playwright.introduction.config.ts` : départs inversés sur téléphone, héroïne chevalière, deux Vikings, réduction des animations et groupe final correct.
- `playwright.dialogue.config.ts` : 2 scénarios de non-régression des dialogues FE8, profils complets, clavier, pagination et ennemi.
- Parcours complet supplémentaire sur le prototype compilé, avec le préfixe de publication : réussi.
- Compilations standard et prototype, puis contrôle du prototype : réussis.
