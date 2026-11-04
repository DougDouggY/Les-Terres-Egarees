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

2. Réalisé : prévision compacte et symétrique, calculs inchangés, aide retirée de cette fenêtre.
3. Réalisé : objectif discret, menu Échap, sélection par coins, informations de case transparentes et menu contextuel près de l’unité.
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
- Menu principal → **Tests de combat** : désormais deux entrées uniquement, parade/riposte et arène sur la carte du chapitre 1. Les anciennes scènes détaillées restent des modules de vérification internes ; leurs boutons ne figurent plus dans le menu.
- Atelier : changements de classe immédiats, armes sélectionnables, PV et munitions restaurés pour rejouer un échange, cible de soin affichée et réutilisée sans dupliquer les unités, ralenti et pause. Les recrues de test ont des choix de classes fictifs limités au sandbox et respectent leur plafond de niveau.
- Échelle du corps et ancrage des pieds calculés indépendamment des dimensions de la planche et des pointes d’armes. Taille stable entre repos, approche, attaque, recul, défense et soin. Transition d’échelle progressive pendant la transformation.
- Un atlas partagé de 18 effets : six poses de soin vert/doré, six de feu et six d’éclairs. Ces mêmes ressources sont utilisées par les tests et le jeu. La magie offensive des Chevaliers utilise le feu ; celle des Vikings utilise les éclairs. Les arcs/arbalètes gardent leurs flèches.
- Préchargement et préparation des recolorations avant les séquences jouées une seule fois ; la copie de carte de l’atelier n’est plus repeinte à 60 images/s.

Carte, décors, dimensions, composition et placements initiaux, calculs de dégâts/précision, critiques et ordre des frappes conservés. Aucun lancement du premier combat de campagne dans les vérifications ; les nouveaux tests utilisent des fixtures indépendantes.

## Retour interface et contacts — 4 novembre 2026

- Vue d’expédition choisie manuellement : un acteur de l’autre groupe attend, sans changer de vue ni jouer automatiquement. La reprise conserve cette vue. Seuls les ennemis jouent automatiquement.
- Interface tactique sans barre noire, logo, numéro de round ni cadre « À vous de jouer ». Objectif discret sur la carte, initiative remontée sur fond gris translucide. Échap ouvre le menu même avec une unité sélectionnée ; changement d’expédition, observation et brouillard se trouvent dans ce menu.
- Informations de survol au coin inférieur gauche, plus petites, fond transparent et bordure légère. Sélection par angles discrets. Menu d’actions près de l’unité, position bornée dans l’écran ; carte non réduite par ce menu.
- Prévision et résultats compacts ; suppression du texte pédagogique de la prévision. Les calculs et l’ordre des frappes restent identiques.
- Réduction des unités tactiques confirmée dans la version précédente : corps à 0,74 × 32 = 23,68 pixels logiques. Rendu tactique rétabli à 0,74 × 38 = 28,12 pixels (environ 88 % d’une case), sans changer le zoom ni l’échelle des scènes de combat.
- Contacts des essais calculés depuis la silhouette réelle de l’arme à l’impact et la proximité du torse cible, plutôt qu’une approche fixe trop courte. Combat classique : approche accrue de 20 pixels au maximum pour garder un ajustement léger.
- Deux outils accessibles : **Tester les parades** (les huit classes équipées d’un bouclier, parade réussie et riposte immédiate issues d’un échange réel à graine choisie) ; **Tester sur la carte du chapitre 1** (un personnage modifiable, un ennemi à 10 000 PV, attaques répétées, soin de test, forme d’ours). Commandes toujours visibles, pause et ralenti. Aucun enregistrement de campagne ni changement de carte ; HP et placements spéciaux limités aux fixtures de test.
- Vérifications : contrôles Node et 24 scénarios Chromium, dont contacts de l’ours et du lancier monté, chacune des huit parades, commandes mobiles, menu Échap, attente de l’autre expédition, prévision et résultats. Aucun premier combat de campagne créé pour ces vérifications.
