# Suite de la validation des combats

Demande utilisateur : « Validation des combats et prochaine phase de développement ».

## Décisions et protections

- Le gameplay de combat, l'ordre des frappes/ripostes et le zoom sont validés.
- Carte, dimensions, terrain, décors et images antérieures préservés. Les contrôles SHA-256 vérifient leur intégrité.
- Une expédition entièrement hors combat doit arrêter **toute la partie** : réponse explicite de l’utilisateur. La chute du seul héros ne doit pas suffire.
- Aucun recrutement, nouveau scénario ou rééquilibrage ajouté dans cette livraison visuelle.

## Étape 1 — en cours

- Recoloration HSV configurable, nuances conservées et contours de faible saturation traités localement.
- Comparaison synchronisée original/recoloré, réglages et réinitialisation dans la galerie du prototype ; originaux conservés.
- Planches complémentaires mutualisées par classe et équipement : attaques, ripostes partagées explicitement, dégâts, esquives, chutes, seconde main des classes à deux armes.
- Völva et Hamrammr masculins, ours distinct, transformation dans les deux sens. Variantes féminines humaines non produites.
- Parades pour les six profils de boucliers restants, quatre rechargements spécifiques.
- Support des gestes de soin, amélioration, invocation, transformation, rechargement, bannière et fortification dans l’affichage tactique, sans modifier leurs effets ni leur coût en activation.
- Découpage selon les silhouettes réelles, guide des lignes voisines lorsque des pointes se touchent et échelle stable sur l’ensemble des poses d’un modèle.
- Tests des poses complètes dans un cadre de rendu, de la recoloration, de la galerie et des séquences de combat indépendantes.

Les attaques validées de l’Homme d’armes et du Pillard masculins restent sur leur planche précédente. Les ressources générées avec un fond non transparent sont écartées ; pas de détourage destructif ou de remplacement approximatif.

Restent : dessins spécifiques de critiques, esquives et variantes indiquées manquantes, certaines séquences provisoires et contrôles artistiques des pointes proches des bords. Consulter `SPRITES-PRODUCTION-REPORT.json` et `SPRITE-AUDIT.json` pour le détail exact. **L’étape 1 n’est pas annoncée terminée.**

## État des étapes après le retour sur l’initiative

2. Prévision de combat compacte et symétrique, calculs inchangés.
3. Interface tactique : objectif discret, pause/options, sélection par coins, zones utiles et menu contextuel.
4. Réalisé : initiative globale dès le départ, cinématique sans remise à zéro, barre transparente centrée et navigation finie.
5. Réalisé pour la barre et les scènes : une case « ? » par acteur inconnu, sans nom/classe/faction/position dans les attributs ; scènes contenant une unité inconnue non affichées. Vision indépendante avant rencontre, partage après rencontre conservé.
6. Hors combat puis tirage unique en fin de chapitre : 95 % mort définitive, 5 % survie ; indisponibilité pendant le chapitre suivant, résultat immédiatement persisté. Dialogue de pertes configurable.
7. Non-régression et publication de la version validée.

La règle de défaite convenue est implémentée : toute une expédition perdue arrête la partie, la chute du seul héros ne suffit pas. Le tirage 95 % / 5 %, le repos et la persistance des morts restent à réaliser.

## Vérifications de cette livraison visuelle

- 37 tests Node réussis : catalogue réel, images protégées, recoloration et systèmes indépendants.
- 19 tests Chromium réussis : galerie, neuf palettes, comparaison synchronisée, zoom net, lecture des poses et cadrage de toutes les séquences complémentaires.
- Compilations publique et prototype ; contrôle de l’absence des outils de développement dans le build public.
- Aucun lancement de la première mission pendant ces vérifications.

## Livraison initiative, tests et magie

Priorité actualisée explicitement par l’utilisateur : travailler sur la barre d’initiative, faciliter les tests de combat, corriger les variations de taille et ajouter des effets magiques.

- Une file commune réelle aux deux expéditions et aux ennemis, égalités déterministes, une activation par cycle. Reprise conservatrice des anciennes sauvegardes en gardant l’acteur courant et les tours déjà dépensés.
- Rencontre sans remise à zéro ; déplacement déjà engagé conservé dans la sauvegarde et protégé dans le moteur. L’ennemi reprend son action après la scène sans effectuer un second déplacement.
- Barre statique sans étiquette de faction ni nom sous les sprites, centrage, léger zoom au survol, flèches bornées, doubles séparateurs de cycles. Les cases inconnues ne contiennent aucune identité dans leur DOM.
- Menu principal → **Tests de combat** : échange réel toutes classes, deux armes, arc/arbalète, soins alliés, feu, éclairs, initiative et accès aux outils existants.
- Atelier : changements de classe immédiats, armes sélectionnables, PV et munitions restaurés pour rejouer un échange, cible de soin affichée et réutilisée sans dupliquer les unités, ralenti et pause. Les recrues de test ont des choix de classes fictifs limités au sandbox et respectent leur plafond de niveau.
- Échelle du corps et ancrage des pieds calculés indépendamment des dimensions de la planche et des pointes d’armes. Taille stable entre repos, approche, attaque, recul, défense et soin. Transition d’échelle progressive pendant la transformation.
- Un atlas partagé de 18 effets : six poses de soin vert/doré, six de feu et six d’éclairs. Ces mêmes ressources sont utilisées par les tests et le jeu. La magie offensive des Chevaliers utilise le feu ; celle des Vikings utilise les éclairs. Les arcs/arbalètes gardent leurs flèches.
- Préchargement et préparation des recolorations avant les séquences jouées une seule fois ; la copie de carte de l’atelier n’est plus repeinte à 60 images/s.

Carte, décors, dimensions, composition et placements initiaux, calculs de dégâts/précision, critiques et ordre des frappes conservés. Aucun lancement du premier combat de campagne dans les vérifications ; les nouveaux tests utilisent des fixtures indépendantes.
