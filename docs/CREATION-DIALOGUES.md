# Création du visage et dialogues plein écran

La correction de l’utilisateur remplace les personnages d’accueil illustrés par une **voix hors champ** : aucun portrait réservé, aucun nouveau PNJ et aucun portrait retiré des 12 chevaliers ou des 12 Vikings.

## Création

Les paramètres existants (faction, nom, sexe, classe, arme initiale éventuelle) précèdent le bouton « Choisir mon visage ». Une petite fenêtre latérale, sans portrait ni nom, affiche « Approche, enlève ta capuche. »

Le visage apparaît au centre entre deux flèches. La navigation est circulaire ; les filtres de faction, sexe et portrait de l’autre joueur sont conservés. Le bouton Valider fige le choix dans le brouillon. La voix hors champ reprend ensuite :

- Viking : « Prêt pour le grand voyage à l'ouest ? », accordé « Prête » pour une femme.
- Chevalier : la phrase originale exacte, « Allez, on y va ! Le convoi ne va pas tarder. Dépêchez-vous ! ».

Après Continuer, le texte suivant de la faction mène au choix des compagnons. La légende chevalier est « Votre compagnon ». Le paragraphe donnant les instructions de remplacement des compagnons est supprimé, sans autre texte explicatif. Le nombre de compagnons et la règle de remplacement restent ceux du jeu.

Le visage validé rejoint la sauvegarde par le champ HeroConfig.portraitId et le registre d’identités existant. Les associations déjà sauvegardées et les quatre portraits prédéfinis ne sont pas réattribués.

## Présentation des dialogues

La dernière référence visuelle fournie par l’utilisateur remplace la proposition initiale de petite fenêtre en bas : **la scène occupe tout l’écran**, carte en fond, grands bustes ancrés en bas à gauche et à droite, bulle claire en haut. Aucun nom ou séparateur de nom n’est rendu ; les noms restent dans les unités, leurs fiches et les descriptions accessibles des images.

Jusqu’à deux interlocuteurs déjà apparus dans la scène restent visibles. Le personnage actif est mis en avant, l’autre légèrement atténué. Aucune réplique future n’est consultée pour dévoiler un personnage avant son apparition. Une voix mystérieuse sans unité peut donc rester hors champ. Les portraits sont affichés avec leurs proportions, épaules comprises, et retournés en CSS selon leur côté.

Un masque d’affichage retire seulement les pixels de fond marine reliés aux bords des portraits. Les détails sombres enfermés dans la silhouette et les couleurs de l’image restent conservés ; les PNG sources ne sont pas retouchés. Le masque est mis en cache pendant la session.

Le code qui dessinait une frame de sprite dans un cadre de dialogue a été supprimé. Un chemin historique de sprite est refusé comme portrait d’identité : un portrait PNJ importé sert de secours (allié bleu, ennemi rose, Sans-Repos). Les données de sauvegarde d’origine restent conservées ; ce secours n’alloue pas un nouveau visage dans le registre.

Les longues répliques sont divisées en pages visuelles de deux à trois lignes. La concaténation de ces pages redonne exactement le texte source. Clic, Entrée et Espace terminent l’affichage puis changent de page ; la scène du scénario n’avance qu’après la dernière page. Les cinématiques automatiques, choix communs, conditions de recrutement et sprites sur la carte gardent leur fonctionnement.

## Fichiers

- `src/game/creation.ts`, `src/ui/creator.ts`, `src/main.ts` : phases de création, carrousel, validation, fenêtres hors champ et libellés.
- `src/game/portraits.ts` : résolution du portrait importé et secours générique sans utiliser de sprite.
- `src/ui/chapter-dialogue.ts` : présentation narrative, portraits, pagination visuelle et commandes.
- `src/ui/dialogue-presentation.ts` : résolution des deux interlocuteurs et division du texte sans réécriture.
- `src/ui/portrait-mask.ts` : masque de fond à l’affichage, indépendant des ressources de combat.
- `src/style.css` : composition plein écran, bulles, portraits, fenêtres latérales et adaptation mobile.
- `tests/portraits.test.ts`, `tests/portraits.spec.ts`, `tests/dialogue-presentation.test.ts`, `tests/dialogue-presentation.spec.ts`, `playwright.dialogue.config.ts`, `package.json` : contrôles automatisés.

## Vérification

- `npm test` : 172 tests, dont le cycle des visages, le catalogue complet, les associations Athéna/Solveig, les portraits génériques, la pagination sans perte et le masque non destructif.
- `npx playwright test --config=playwright.portraits.config.ts` : création complète des deux factions, flèches, voix sans portrait, validation, compagnons, sauvegarde/reprise, portraits des deux héros, Maëlys, Géraud et fiches.
- `npx playwright test --config=playwright.dialogue.config.ts` : scène plein écran à un puis deux personnages, épaules non recadrées, noms absents, texte paginé au clavier et au clic, téléphone et interlocuteur ennemi.
- Contrôle supplémentaire de création et reprise sur le prototype compilé avec son préfixe de publication.
- `npm run build`, `npm run build:prototype -- --base=/Les-Terres-Egarees/`, `npm run check:prototype`.

Les cartes, classes, paramètres de combat, textes narratifs et conditions de recrutement ne sont pas modifiés.
