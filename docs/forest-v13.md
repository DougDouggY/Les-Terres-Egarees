# V13 — Correctifs visuels et tactiques du chapitre 1

## Changements livrés

- **Carte 34 × 20 exactement** : recadrage de l'ancienne forêt 60 × 40, retrait de 10 colonnes à gauche, 16 à droite, 15 lignes en haut et 5 en bas. Le relief et les zones de végétation sont repris de la carte existante, sans nouvelle image. Les limites de caméra, le dézoom, les coordonnées, les indices de visibilité et le pathfinding utilisent les dimensions actives. Le prologue conserve ses 60 × 40.
- **Routes selon la capture** : route principale horizontale complète sur les rangées 9 et 10, jusqu'aux deux bords ; embranchement nord raccordé aux colonnes 9/10 ; suppression du chemin parallèle supérieur au profit de l'herbe. Le circuit secondaire au sud est raccordé. Le rendu peint les cellules entières avec les textures déjà disponibles, au lieu d'une fine ligne sur une seule rangée. Le coût routier reste 0,75.
- **Formation des héros conservée** : mêmes deux rangs et même ordre, simplement décalés de −10/−15 après recadrage.
- **Avertissement puis mouvement** : les gardes restent immobiles pendant les deux premières répliques. Le clic suivant l'avertissement de Maëlys lance une séquence d'approche de 2,6 s. Le capitaine parle seulement après l'arrêt à deux cases de la tête du groupe. Les répliques validées restent identiques.
- **Validation explicite** : une sélection commune n'avance plus automatiquement. « Valider » est désactivé en désaccord. En test local, un clic valide les deux sélections concordantes ; dans une session propriétaire, chaque joueur confirme individuellement. Changer une sélection annule les confirmations antérieures, et une confirmation périmée est ignorée. Votes et confirmations se sauvegardent.
- **Embuscade partielle** : onze ennemis, composition inchangée. Avant-garde à droite, groupes au nord-est/sud-est et pression au sud ; pas de cercle autour des héros. Géraud est en ligne intermédiaire, le capitaine en retrait. Les renforts partent de cellules proches et valides. Le déploiement commence sans délai volontaire initial et dure 4,2 s, contre 6,8 s auparavant.
- **Capitaine et futurs boss** : déplacement effectif nul tant que la règle le verrouille ; aucun champ de déplacement au survol, à la sélection ou avec D. Sa portée d'attaque reste affichable depuis sa case. Une vraie perte de PV débloque durablement le mouvement, y compris après soin/reprise. Calcul des portées, validation des déplacements et fiche d'unité utilisent la même valeur effective, sans changer la statistique de base. Un ennemi qui reste sur sa case ne joue plus de marche sur place.
- **Départ du prologue** : les représentations des unités sortent complètement du cadrage vers le bas à droite et cessent d'être animées ensuite. Attendre ne les fait plus marcher indéfiniment. Un clic rapide peut poursuivre sans attendre la marche complète ; aucune position tactique réelle ne change.
- **Narrations** : sans personnage, le portrait et sa colonne sont absents ; le texte reprend l'espace. Les dialogues avec personnage restent identiques. La grotte et le recrutement de Géraud sont conservés.
- Le fond forestier des combats reste choisi par le chapitre, même aux nouvelles coordonnées proches de x=0 ; le recadrage ne les transforme pas en combats côtiers.

## Compatibilité

Les anciens créneaux de sauvegarde ne sont ni supprimés ni remis à zéro. Une ancienne partie forestière garde sa carte 60 × 40 et ses coordonnées ; un nouveau lancement utilise l'identifiant `forest-compact`. Les deux formats restent décodables et les anciennes cinématiques restent jouables. Les noms des clés de sauvegarde normale et de test ne changent pas. Pour voir la nouvelle carte et la nouvelle mise en scène, lancer **Tester chapitre 1**, plutôt que reprendre un ancien test déjà déployé.

Aucune statistique de classe, règle de dégâts, réplique de grotte, promotion, condition de recrutement ou ressource graphique n'est régénérée. Les empreintes protégées du rendu du terrain et de l'accès aux cellules de végétation sont actualisées pour la prise en charge explicite des dimensions variables ; le terrain et les images du prologue restent protégés.

## Vérifications

- Suite moteur et ressources : 118 tests, dont six nouveaux scénarios V13. Découpe/terrain conservé, route de deux rangées, limites/indices de grille, trajectoires, composition, groupes d'activation, accord sans avance automatique, confirmations indépendantes/invalidation des messages périmés, boss et portées sans mutation, sauvegardes nouvelles/anciennes.
- Parcours navigateur ciblés : sortie du prologue et clic rapide ; narration pleine largeur ; lecture de Maëlys sans départ anticipé puis approche ; accord local explicitement validé ; confirmations de chaque propriétaire ; déploiement sur écran large et portées du capitaine avant/après dégâts.
- Régressions : finale du prologue jusqu'à la bataille, deux réponses narratives, recrutement volontaire de Géraud sans tour supplémentaire et conclusion dans la grotte. Vérification d'une attaque réelle et du fond forestier après recadrage.
- Captures dans `artifacts/forest-v13/`, notamment la route, le déploiement, le bouton Valider et les deux états de portée du capitaine.
- TypeScript, compilations publique/prototype et contrôles des outils de développement.

L'écran scindé et les validations locales restent des outils du prototype ; aucun second système réseau n'est ajouté. Le branchement du transport Cloudflare reste hors de cette correction.
