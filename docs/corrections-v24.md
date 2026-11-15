# Corrections des portraits, animations, combats et prologue

## Résultat

### Sauvegardes

Le gestionnaire Charger une partie affiche une suppression directe et identifiable pour les emplacements nommés **et pour les anciennes sauvegardes**. La confirmation désigne la partie concernée. La suppression efface uniquement sa clé ou son emplacement et relit immédiatement le stockage. Les anciennes parties ont désormais des libellés lisibles plutôt que des clés techniques. Aucune sauvegarde automatique n'est ajoutée.

### Portraits et fiches

- Le traitement mesure la silhouette opaque avant de recadrer les marges transparentes. Les fiches utilisent une référence de hauteur de tête et un cadre transparent 4:3 ; les dialogues gardent leur propre échelle.
- Les proportions des images sont conservées ; aucun personnage n'est déformé et aucun fond n'est créé derrière le visage.
- Les zones sombres des yeux de C03 (barbe blanche), C04 (crâne rasé) et C06 (cheveux courts marron) sont protégées par des polygones ciblés, référencés sur les originaux. Le vrai fond reste transparent.
- Les marges inutiles aux coins sont supprimées. Le recadrage de la silhouette élimine également les lignes transparentes sous certains Vikings.
- Les infobulles contenant seulement le nom sont placées au bas du portrait. Leur fonctionnement tactile et leur masquage sont conservés.

### Recoloration réellement appliquée

La recoloration de Géraud était déjà présente ; elle reste active sur son foulard : rose lorsqu'il est ennemi, puis couleur du joueur qui le recrute. Elle est vérifiée dans les fiches et dialogues, avec la même identité R03.

Des masques de tenue supplémentaires recolorent des détails bleus de **C01–C09 et C11**, selon la couleur d'équipe. Ils sont appliqués à l'affichage, y compris dans les introductions. Les régions du visage, les cheveux, les dorures et les métaux neutres sont exclus ; la luminance est conservée. Les originaux ne sont pas modifiés.

**Limite volontaire :** C10, C12, les tatouages et marques des Vikings, les fourrures, les costumes prédéfinis hors foulard de Géraud et les génériques conservent leurs couleurs sources. Une modification de ces zones serait moins sûre ou toucherait à l'identité du personnage. La fonctionnalité ne prétend donc pas recolorer tous les portraits.

### Sprites et attente

Les aperçus sont dessinés à la résolution physique du canvas, sans interpolation, avec une même ligne de pied. Les deux sexes du Pillard, avec hache ou épée/bouclier, sont comparés au Guerrier du Nord et au Chasseur.

L'audit porte sur **89 profils enregistrés**, y compris les ennemis, et **96 combinaisons légales de classe, sexe, équipement et état** :

- 52 profils possèdent deux poses d'attente dont les rendus ont des empreintes différentes ;
- 37 n'offrent qu'une pose. Ils utilisent une petite respiration géométrique à pieds stables, sans duplication de fichiers ni invention de nouvelles frames ;
- aucune ressource d'attente manquante ou vide n'est constatée dans ce périmètre ;
- les configurations spéciales (bannière portée/plantée, humain/ours) sont examinées dans leur état légal ;
- les animations natives respectent leur cadence, et la respiration ne s'applique ni aux déplacements ni aux attaques.

Les résultats détaillés figurent dans `idle-pose-audit.json` et `idle-class-coverage.json`.

**Limite du dessin fourni :** la silhouette de repos de la Pillarde épée/bouclier mesure **77 × 77 pixels** dans son atlas. Le rendu évite un flou supplémentaire, mais ne peut récupérer des détails absents de cette ressource. Son style validé et le fichier original sont conservés.

### Fenêtre de combat

Toutes les scènes utilisent le même cadrage, élargi horizontalement (plafond de largeur 1400 px au lieu de 1120 px), avec la même règle de hauteur qu'auparavant. Les sprites gardent leurs proportions grâce à une scène interne plus large. Les quatre textes décoratifs des coins sont supprimés. Le fond extérieur montre une capture de la carte tactique courante ; le décor propre au duel reste dans sa fenêtre. Les règles de dégâts et de riposte ne changent pas.

### Bandages

Les **nouvelles parties** commencent avec deux bandages par équipe : un sur chaque Chevalier et deux porteurs Vikings choisis par une répartition pseudo-aléatoire liée à la partie. Le générateur de combat n'est pas consommé par cette répartition. Les stocks des anciennes sauvegardes, et les ateliers ou acquisitions déjà prévus par le jeu, restent conservés.

Depuis la fiche du personnage actif, choisir Bandages puis Utiliser propose soi-même et les alliés orthogonalement adjacents auxquels il manque au moins un PV. Une cible à pleine vie, morte, ennemie, diagonale ou trop éloignée est refusée. Le bandage du porteur est consommé une seule fois, le soin est plafonné aux PV manquants et l'action termine son activation. La commande fonctionne aussi si le porteur est indemne et que seul son voisin est blessé.

### Rencontre, secours et sorcière

- Les unités de l'armée sont affichées à leurs vraies coordonnées lors de la rencontre et de l'arrivée de la sorcière. Les coordonnées de campagne ne sont jamais réécrites par la mise en scène.
- Les rôles de parole sont confiés aux survivants. Les identités explicitement mortes ne prononcent pas de réplique.
- Pendant le secours, le portrait N05 du Sans-Repos apparaît derrière celui de la victime. Le sauveteur se déplace visuellement depuis son emplacement, frappe, puis revient. Le sprite et le portrait du Sans-Repos disparaissent après l'impact, accompagné d'un flash et d'une courte secousse. La préférence de réduction des mouvements supprime la secousse.
- Les séquences de secours, d'apparition et de départ attendent la disponibilité des sprites ; leur temps de chargement ne consomme plus leur lecture. Le texte conserve sa propre horloge.
- La première voix de la sorcière vient du bord gauche sans portrait. Les deux interlocuteurs se regroupent à droite, face à gauche. Son portrait apparaît ensuite en bas à gauche, tourné vers eux. L'armée ne se déplace pas pendant son arrivée ou son discours.
- Le chef peut préparer l'entrée depuis les trois cases immédiatement devant la porte, en plus des positions déjà autorisées. La sécurité de l'entrée et la nécessité d'un chef vivant restent les règles existantes.

### Sans-Repos éloignés

Le déplacement du prologue prend en compte le coût d'un vrai chemin vers les ruines ou une position de tir, au lieu d'utiliser uniquement la distance à vol d'oiseau. Une cible inaccessible ne bloque plus indéfiniment une unité ; une poursuite engagée et accessible reste conservée. Les missions et comportements spécifiques du chapitre forestier sont préservés.

Les huit placements ennemis initiaux sont testés en simulation jusqu'à convergence ou possibilité d'attaque. La partie exacte contenant les sept ennemis signalés n'a pas été inspectée, puisqu'aucune sauvegarde de cette partie n'a été fournie. Il n'y a ni téléportation ni suppression de ces ennemis pour masquer le problème.

## Vérifications effectuées

- `npm test` : **191 tests réussis** (42 rendu et 149 systèmes), dont stocks initiaux, sauvegardes anciennes, soins adjacents, restrictions de cible, trois cases devant la porte, interlocuteurs vivants, convergence et cible inaccessible sans perte des poursuites valides.
- `playwright.updates.config.ts` : **8 tests réussis** : utilisation réelle d'un bandage et passage de tour, combat élargi, suppression persistante des deux formats de sauvegarde, yeux et recolorations, rencontre/sorcière/impact, huit présentations de sprites Vikings, puis reprise de l'attente de la Pillarde hache, de la Pillarde épée et de la Lame nordique féminine après déplacement et action, ainsi que le fond tactique du combat repris directement après une cinématique.
- `playwright.corrections.config.ts` : **9 tests réussis** de non-régression des créations, portraits, dialogues et sauvegardes.
- `playwright.refinements.config.ts` : **6 tests réussis** sur les introductions, interfaces sans défilement, noms au survol et au toucher, et attente de la Guerrière du Nord sur la carte.
- Les builds et contrôles de publication sont exécutés avant l'envoi sur main.

Les vérifications navigateur ciblées représentent donc **23 tests distincts**. Les anciennes suites historiques qui supposent les anciens menus ne sont pas toutes rejouées.

## Fichiers principaux modifiés

- `src/ui/portrait-mask.ts`, `src/ui/portrait-layout.ts`, `src/ui/character-sheet.ts`, `src/style.css` : masques, couleurs, cadres et dimensions.
- `src/ui/creator.ts`, `src/sprites/display-scale.ts` : présentation des sprites et attente.
- `src/ui/save-manager.ts` : suppression des anciens et nouveaux emplacements.
- `src/game/campaign.ts`, `src/game/inventory.ts`, `src/main.ts` : stocks et utilisation des bandages, cadrage des combats.
- `src/ui/chapter-dialogue.ts`, `src/ui/dialogue-presentation.ts`, `src/game/prologue.ts` : mise en scène, survivants et accès aux ruines.
- `src/game/ai.ts` : chemins de convergence et cibles inaccessibles.
- `src/ui/introduction-scene.ts` : application des couleurs dans les introductions.
- Tests ajoutés ou adaptés, `playwright.updates.config.ts`, manifeste d'audit et `package.json`.

Aucun portrait, sprite, décor, carte ou capture suivi par Git n'est redessiné ou remplacé.

## Correction suivante — portraits originaux et aperçu du Pillard

À la demande du joueur, toute recoloration des portraits est supprimée, y compris celle de Géraud. La transparence et les protections des yeux sont conservées ; les couleurs d'équipe des sprites tactiques restent indépendantes.

L'aperçu de création mesure maintenant la silhouette complète dans une surface intermédiaire avant de la centrer et de l'adapter au cadre sans découper l'arme ou les pieds. La largeur du canvas ne dépend plus de ses dimensions internes. L'alignement vertical de la colonne visuelle part du haut du formulaire, même lorsque le Pillard possède un champ d'arme supplémentaire. Le statut de chargement est réinitialisé à chaque changement d'arme.

Vérification navigateur : Pillard/Pillarde, hache/bouclier et épée/bouclier, changements d'arme répétés, largeurs 1806 et 800 pixels avec densité 2 ; silhouette entière, centrage horizontal et position verticale relative à l'autre chef. Les petits écrans où le jeu masque déjà l'aperçu gardent ce comportement.

Le dessin de la Pillarde à l'épée n'est pas refait : sa silhouette d'origine mesure environ 77 × 77 pixels et contient déjà le manque de netteté observé. Une source plus détaillée ou un nouveau dessin est nécessaire pour gagner en détail ; la désactivation du lissage ne recrée pas ce détail.
