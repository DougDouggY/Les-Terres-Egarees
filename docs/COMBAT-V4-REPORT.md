# Correctif V4 — bilan vérifiable

La carte, ses décors et dimensions, l’initiative et son bouton œil, les sauvegardes, les statistiques et les calculs de combat restent conservés. Les fichiers de règles, classes, promotions, déplacements et brouillard ne sont pas modifiés. Les clips validés de course et d’attaque de l’ours, ainsi que ceux du Brise-fer masculin, sont conservés intégralement et protégés par un test.

## Corrections

- Course et galop : les racines des poses sont enregistrées sur le haut du corps plutôt que sur le pied alternativement avancé. Le déplacement global reste calculé par la trajectoire du kit. 279 références de locomotion sont contrôlées ; l’ours est exclu de cette correction. Le [rapport des racines](COMBAT-V4-ROOT-AUDIT.json) conserve les anciens/nouveaux repères et la confiance de correspondance. L’approche pédestre gagne 120 ms (80 ms pour un premier coup lié), sans ralentir l’impact, le retour ni les projectiles.
- Échelle : chaque source conserve sa référence anatomique debout issue du profil d’origine, même si sa dernière animation restante est une blessure. Les nouvelles sources ont une référence explicite ; la pose accroupie du pavois féminin utilise la référence debout du même personnage. Aucun zoom n’est recalculé par image de blessure.
- Stabilité de lecture : les images recolorées préparées sont conservées pendant le duel, indépendamment du cache global limité à 64 Mio. Une activité de carte/galerie ne force plus leur recalcul au milieu d’une riposte. Un test provoque l’éviction et compare le rendu pixel par pixel.
- Réactions : le premier dessin réellement blessé est affiché au contact ; l’ancienne sélection systématique de l’image 2 pouvait afficher immédiatement un retour en garde. Les clips V4 indiquent explicitement leur image de blessure. Les défenses provisoires restent en garde avant le contact. Les événements et les PV proviennent toujours du résultat tactique unique.
- Jeune Viking masculin : nouvelle garde, course, frappe, blessure et chute avec la même petite hache ; aucune épée de remplacement. Pillard masculin à la hache : vraie blessure dédiée. Exécuteur : préparation à deux mains et nouvelle frappe ample à la grande épée. Lancier monté : pointe abaissée vers le combattant à pied. Les déplacements montés existants sont conservés, y compris les trois poses de galop du Lancier. Les variantes féminines de Pillard/Jeune Viking reçoivent aussi des préparations corrigées à la hache. Les blessures du Rôdeur à l’épée, du Traqueur à la hache et du Chevalier de la garde sont redessinées avec leur équipement propre.
- Magie viking : apparition d’un petit nuage gris au-dessus de la cible avant l’éclair existant. Les règles, dégâts et portées restent identiques.
- Ressources : profils masculins propres au Chasseur et au Grand Chasseur ; ressources féminines propres aux classes jouables dont l’équivalent masculin existait, notamment Chamane, Sorcière et leurs promotions. Une erreur de recoloration revient à l’image source du même skin et émet un avertissement, jamais au sexe ou à la classe d’un autre personnage.
- Soins sur carte : animation du soigneur, cible et effet de soin, valeur de PV réellement restaurée. Les bandages ont leurs propres poses et n’affichent pas d’effet magique.
- Comparateur : essais de capacités utilisant le moteur réel dans une arène jetable : soins, bandages, transformation et statistiques d’ours, pavois et sa suppression après déplacement, bannière, invocation, amélioration, attaque de zone de l’Archimage et charge montée après trois cases de vrai déplacement. Le statut et le diagnostic affichent les résultats réels. Une invocation ne transforme plus visuellement un allié en créature : celle-ci apparaît après l’incantation. Les attaques à la hache du Traqueur restent sélectionnables par l’arme.
- Prévision : deux en-têtes côte à côte, chiffres alignés, ×2 sous les dégâts, nom et arme repliables sans troncature, triangle issu des vraies prévisions, bordure et fond médiévaux discrets. Fenêtre remontée et contenue dans le viewport, y compris en paysage mobile. Aucun grand voile noir ni barre de PV.
- Compagnons : le dernier choix remplace automatiquement le plus ancien au plafond (2 Vikings / 1 Chevalier). La distribution scénarisée existante des compagnons est conservée ; aucun Sorcier supplémentaire n’est ajouté au départ. Retrait du texte technique parasite de création.
- Couleurs : seuls les deux alliés sont réglables ; les ennemis conservent leur palette définie, y compris avec une ancienne sauvegarde contenant une autre couleur ennemie.

## Couverture et ressources réellement créées

**41 entrées de classes/promotions/Sans-Repos, 89 profils**, dont les 55 profils V3 conservés et 34 profils ajoutés (32 combinaisons féminines d’arme/état, 2 chasseurs masculins). Les personnages intégralement casqués déjà définis comme neutres restent neutres ; aucune variante ennemie féminine fictive n’est ajoutée.

Les variantes féminines ajoutées couvrent : Guerrier du Nord, Lame nordique, Berserker, Drengr, Brise-fer, Duelliste, Huscarl (hache/épée), Guérisseur du clan (hache/épée), Pillard à l’épée, Jeune Viking, Chaman, Sorcier, Nécromancien, Archimage, Völva, Hamrammr humain, Arbalétrier, Arbalétrier à pavois (mobile/déployé), Traqueur (arc/hache), Rôdeur (arbalète/épée), Porte-étendard (porté/planté) et Écuyer. Les variantes féminines V3 existantes restent présentes.

**14 atlas PNG transparents nouveaux ; 328 cellules effectivement référencées.** Les sources antérieures ne sont pas retouchées. Le [manifeste artistique](COMBAT-V4-ART.json) contient les empreintes SHA-256, dimensions et cellules. La première proposition masculine de déploiement du pavois est écartée : la barbe varie entre ses propositions ; une nouvelle séquence masculine à barbe brune constante la remplace.

L’[inventaire complet par profil](COMBAT-V4-INVENTORY.md) et son [JSON](COMBAT-V4-INVENTORY.json) distinguent les animations présentes, réutilisées, provisoires et absentes. La [revue visuelle manuelle](COMBAT-V4-VISUAL-REVIEW.md) détaille les constats et réserves. Les planches de contrôle sont dans `artifacts/combat-v2/`, les contrôles V4 et captures d’interface dans `artifacts/combat-v4/`.

## Limites artistiques explicites

La présence d’une pose et des tests réussis ne certifient pas une finition artistique parfaite. Les nouvelles planches restent marquées **provisoires** dans la galerie. Une esquive empruntant la réaction du même personnage et une seconde activation réutilisant sa frappe sont identifiées comme telles, sans emprunter de skin étranger.

Le retour ours → humain conserve la garde animale avant de révéler le vrai skin humain de l’unité : l’ancienne bande contenant un homme est écartée du skin animal commun, pour ne pas la montrer à une Hamrammr féminine. Les dessins intermédiaires de ce retour restent provisoires.

Des dessins dédiés restent absents : principalement les critiques propres à chaque skin, certaines esquives anciennes, l’interception féminine du Huscarl et la transition historique masculine de bannière. Leur liste exacte est dans l’inventaire ; aucun dessin d’une autre classe n’est chargé pour masquer ces lacunes. Les anciens atlas comportent aussi des contours adjacents et cellules au bord signalés dans `SPRITE-AUDIT.json`. Une transition utilisant une garde de secours reste signalée dans les diagnostics. Cette version ne doit donc pas être présentée comme une bibliothèque artistique intégralement finalisée.

## Validation et publication

La suite de règles et ressources `npm test` passe. Les **39 scénarios d’interface Chromium** sont validés par la suite complète et les reprises ciblées après corrections : la dernière reprise de 16 scénarios passe entièrement. L’audit indépendant couvre **89 profils, 801 rendus de palettes et 262 séquences** à ×1/×0,2, sans ressource invisible, événement supplémentaire ou erreur JavaScript. Les 801 rendus ont une couverture alpha identique quelle que soit la palette. La compilation et les contrôles public/prototype sont exécutés avant publication. Les contrôles incluent TypeScript, tests de règles non régressifs, profils et cellules, capacités réelles, interfaces Chromium, soins féminins en Aventure, prévision mobile, palettes et séquences des deux côtés à vitesse normale et ×0,2.

- `npm run build -- --base=/Les-Terres-Egarees/` : réussi.
- `npm run check:public` : réussi, galerie/bancs de développement inaccessibles dans cette compilation.
- `npm run build:prototype -- --base=/Les-Terres-Egarees/ --outDir dist-prototype` et contrôle du prototype : réussis, outils accessibles.
- Avertissement Vite conservé : le lot principal dépasse 500 ko (environ 4,1 Mo, 1,07 Mo compressé), notamment avec les métadonnées et la bibliothèque de sprites. Aucune erreur TypeScript ou de compilation.
- Les séquences et palettes de l’audit global ont zéro divergence d’alpha et zéro impact ajouté ; la vérification d’éviction confirme un rendu identique des images préparées.
