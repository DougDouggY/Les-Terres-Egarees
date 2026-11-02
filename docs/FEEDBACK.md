# Retours de test — priorités

## Cette passe

- Remplacer le quadrillage sombre par une nappe de brume animée et continue.
- Recouvrir de la même brume les cases découvertes qui sortent de la vision.
- Conserver les visions indépendantes, les animations de repos et les déplacements.
- Rendre les sprites et le terrain moins crénelés sans générer de nouvelles images.
- Structurer le sanctuaire par une enceinte, des murs intérieurs et des portes larges.
- Expliquer le rôle de chaque statistique, y compris l’initiative indépendante de l’agilité.
- Préserver les sauvegardes : une unité sur un mur ajouté est déplacée vers une case libre proche, en conservant ses PV, objets, expérience et progression.

## Mis de côté à la demande de l’utilisateur

Aucune génération d’images pendant cette passe. Les illustrations de cinématiques
restent à remplacer plus tard : meilleure résolution native et choix de plans
fidèle au texte (notamment le bateau dans la tempête, pas seulement le ciel).
Le traitement actuel des sprites améliore le rendu ; il ne constitue pas une
nouvelle direction artistique cartoon ni une nouvelle série d’illustrations.

## Références fournies

- https://le-dernier-raid.ledougoudouggy.chatgpt.site/ : unités, combats et rôle des statistiques.
- https://le-dernier-raid-3d-test.ledougoudouggy.chatgpt.site/ : carte d’Angleterre et brouillard.

Les deux requêtes ont été refusées par le proxy réseau de l’environnement
(CONNECT 403). Leur apparence et leurs formules n’ont donc pas pu être étudiées.
La refonte exacte de la carte du monde et l’alignement des règles sur ces exemples
restent à faire après accès aux références. Les formules de combat actuelles ont
été conservées ; aucune formule supposée de ces jeux n’a été inventée.

## Correctif après test de sélection

La couche de déplacement accédait à une variable de case avant sa déclaration
lorsqu’une destination potentielle était hors de vue. L’exception interrompait
le dessin avant la brume et les personnages. Le test navigateur reproduit ce
défaut avant correction et vérifie ensuite la texture de brume ainsi que le
dessin continu des ennemis visibles pendant la sélection.

Les alliés sont maintenant traversables : même armée, ou deux expéditions après
leur alliance. Une destination occupée reste interdite. Les ennemis restent
bloquants. Les règles de contrôle et les coûts de terrain sont conservés.

Le style cartoon demeure une reprise des ressources graphiques, distincte du
correctif de rendu. Aucune nouvelle image créée pour ces corrections.

## Choix graphique confirmé ensuite

L’utilisateur a choisi de refaire uniquement le tileset. Une seule nouvelle
planche a été générée : terrain cartoon peint, contours souples, pierres et
végétation simplifiées. Les 32 rôles de tuiles restent identiques. Les cellules
sont conservées en 128×128 pixels pour 32 pixels logiques, et les routes sont
réassemblées à la même résolution. Aucun nouveau sprite ni plan de cinématique.
Les URL de terrain sont versionnées pour éviter de garder l’ancien atlas en cache.
