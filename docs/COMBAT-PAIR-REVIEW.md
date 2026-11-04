# Deux combattants — essai à valider

Accès dans le menu du prototype : **Essai des combats**. Le même écran est accessible depuis l’Atelier de test, par « Essai des deux combattants ».

Seuls l’Homme d’armes et le Pillard masculins ont reçu une nouvelle planche : 16 poses chacun, 32 dessins au total. Les variantes féminines, les autres classes, la carte, les décors, les effectifs et les règles de combat restent conservés. Les anciennes images sont présentes sans retouche.

## Les deux boutons

1. **Deux frappes successives** : approche, préparation, arme levée, frappe diagonale, récupération ; seconde frappe horizontale au contact ; retour en garde puis recul. Une seule arme, aucun système d’armes doubles.
2. **Parade, riposte et votre tour** : attaque de l’adversaire ; parade au bouclier sans perte de PV ; riposte immédiate au contact ; retour de l’adversaire à sa position ; temps de passage de tour ; approche et attaque de votre personnage, puis retour.

Le choix « Votre personnage » inverse les rôles pour vérifier les deux combattants. Ralenti, pause/reprise et relecture sont disponibles. Chaque clic reconstruit l’essai visuel depuis le début ; les animations s’arrêtent en garde finale.

## Poses et lecture

La nouvelle planche contient garde, pas, anticipation, levée, frappe diagonale, suivi, retrait, garde finale, levée de bouclier, blocage, recul du buste, baisse du bouclier, anticipation de riposte, frappe horizontale, récupération et réaction aux dégâts.

Le manifeste partagé enregistre une attaque à huit images, une riposte à six images et une parade à quatre images. La seconde frappe simple réutilise explicitement la variante horizontale de la riposte. Les dégâts utilisent encore une pose unique, marquée provisoire. Aucun sprite d’arme double, de nouvelle classe ou d’autre capacité n’a été généré.

Les rectangles des 32 dessins sont isolés par leurs composantes alpha pour conserver les pointes d’armes débordant de quelques pixels d’une colonne nominale, sans embarquer le fragment du personnage voisin. Les pieds utilisent une ligne de sol commune. La portée visuelle dépend du dessin de contact de chaque arme. La frame d’impact est aussi déclarée dans le manifeste pour la scène de combat partagée.

Le kit du Dernier Raid sert de référence pour les ancrages, les phases de contact et les enchaînements. Ses images, chiffres de dégâts et règles ne sont pas importés dans le jeu.

## Isolation

Cet écran est une démonstration scénarisée : 24 PV initiaux et impacts visuels de 4 PV. Aucun appel au créateur de campagne, au résolveur des combats, à la progression ni aux sauvegardes. Ces résultats servent exclusivement à vérifier les dessins et leur mise en scène. La carte et le fonctionnement des combats réels ne sont pas rééquilibrés.

L’écran est réservé au prototype de test et absent de la compilation publique normale. La génération des autres unités attend la validation de cette paire.

## Vérifications

- Empreintes des ressources antérieures et du terrain validé.
- Deux impacts pour le premier bouton ; aucun recul entre eux.
- Parade sans dégât ; riposte au contact ; adversaire rentré avant l’attaque suivante.
- Aucun clip d’attaque pendant le retour spatial.
- Fin immobile, pause/reprise, réinitialisation et sortie sans animation résiduelle.
- Essais pour les deux rôles, écran de petite largeur, aucune sauvegarde ou mission créée.
- Les frames de contact déclarées sont utilisées pour synchroniser la scène partagée.

Validation effectuée : 8 tests unitaires visuels et 10 tests Chromium réussis ; contrôle ciblé du petit écran réussi après placement des cadres hors de la scène. Compilations publique et prototype vérifiées.

L’audit optionnel des rectangles (`scripts/audit-sprite-layout.py`) utilise Pillow, NumPy et SciPy ; il lit les images sans les modifier. Les métadonnées générées sont versionnées, sans dépendance Python à l’exécution du jeu.
