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

## Étapes suivantes — à réaliser dans l’ordre demandé

2. Prévision de combat compacte et symétrique, calculs inchangés.
3. Interface tactique : objectif discret, pause/options, sélection par coins, zones utiles et menu contextuel.
4. Initiative globale dès le départ, cinématique sans remise à zéro, barre centrée et navigation finie.
5. Brouillard par perspective : une case « ? » par acteur inconnu, aucune fuite de données.
6. Hors combat puis tirage unique en fin de chapitre : 95 % mort définitive, 5 % survie ; indisponibilité pendant le chapitre suivant, résultat immédiatement persisté. Dialogue de pertes configurable.
7. Non-régression et publication de la version validée.

La règle de défaite convenue ci-dessus doit être implémentée avec l’étape 6 ; le moteur actuel n’a pas encore été modifié pour cette phase.

## Vérifications de cette livraison visuelle

- 28 tests Node réussis : catalogue réel, images protégées, recoloration et systèmes indépendants.
- 13 tests Chromium réussis : galerie, neuf palettes, comparaison synchronisée, zoom net, lecture des poses et cadrage de toutes les séquences complémentaires.
- Compilations publique et prototype ; contrôle de l’absence des outils de développement dans le build public.
- Aucun lancement de la première mission pendant ces vérifications.
