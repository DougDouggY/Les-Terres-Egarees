# Reprises des Chevaliers de base et essai complet

## Périmètre

Les visuels des douze variantes vikings de base sont validés par l’utilisateur ; leur validation d’animation en situation reste à faire. Ils sont utilisés sur la carte et en combat. Les classes avancées ne sont pas reprises.

Six variantes chevalières ont de nouvelles planches, avec une silhouette plus élancée et une qualité homogène : Homme d’armes, Femme d’armes, Épéiste homme, Épéiste femme, Arbalétrière et Sorcière. Les Lanciers des deux sexes, l’Arbalétrier masculin et le Sorcier masculin restent les références approuvées. Les nouvelles planches restent à valider artistiquement et en animation par l’utilisateur.

La tête de hache levée de la Guerrière du Nord ne comporte désormais qu’une lame d’un seul côté du manche, avec le bois visible à l’extrémité opposée. La planche a été contrôlée pour sa transparence et ses 23 silhouettes complètes. Un bâton initialement doublé sur une pose de la Sorcière a été corrigé avant intégration. Les six dessins de Chevaliers conservent l’armure et le tissu de leur faction, sans fourrure ajoutée.

## Ressources

Les six sources `combat-v4-knight-refresh-*.png` sont enregistrées par `zzzzzzzzzzzz-knight-refresh.sprite.json` et `.combat.json`. Les variantes avec bouclier ont 26 poses ; les Épéistes 23 ; l’Arbalétrière et la Sorcière 27, avec respectivement quatre poses de rechargement et quatre poses de soins supplémentaires. Riposte et seconde frappe réutilisent l’attaque. Les effets de critique, magie et parade restent partagés.

Les Épéistes possèdent maintenant des dessins masculin et féminin distincts. Le catalogue privilégie un profil du sexe demandé avant un profil partagé `any`. Les anciennes associations sauvegardées vers ce profil partagé sont également résolues vers la variante correspondante, sur la carte comme en combat. Les identifiants de classes, unités, portraits et sauvegardes ne changent pas.

Les sources et métadonnées de référence sont mesurées par `register-knight-refresh.py`, sans modification des pixels par le script. Les rectangles englobent les silhouettes complètes, même si les rangées dessinées dévient légèrement de la grille nominale. La recoloration des tissus bleus grisés s’applique aux nouvelles sources et préserve les couleurs naturelles et le métal neutre.

## Essai des animations

Le sélecteur regroupe les douze variantes vikings et les dix variantes chevalières, triées par faction. Les anciennes versions ne sont plus proposées comme unités courantes dans ce menu. Les scènes imposées sont disponibles avec pause, rejeu et vitesse réglable.

Les parades sont réservées aux équipements portant un bouclier. Les archers, arbalétriers et lanceurs de sorts restent à distance ; les soignants ne reçoivent pas de scénario d’attaque artificiel. Le menu « Animation isolée » permet d’observer les poses réellement disponibles, notamment les soins et rechargements. Une démonstration de soins présente une cible alliée et restaure ses PV de démonstration, sans toucher à une campagne.

Les règles de combat, les classes, les recrutements, les dialogues, les portraits et les événements des chapitres ne changent pas.

## Comparaisons et conservation

- `/validation/chevaliers/` : dix variantes actuelles, avec comparaison des six nouveaux dessins et des quatre références conservées.
- `/validation/chevaliers/animations/` : planches des six variantes reprises, avec leurs poses utiles.
- `/validation/chevaliers/couleurs-equipes.png` : jaune et rose sur les véritables ressources.
- `/validation/vikings/` : douze variantes actuelles et terrain tactique.

Les images de terrain des comparaisons sont désormais rendues directement à 1280 × 896 pixels pour le zoom ×2, au lieu d’agrandir un rendu de 640 × 448. La carte, les tuiles et les positions du jeu ne sont pas modifiées.

Les anciens dessins restent de côté jusqu’aux essais en jeu. `docs/art-archive/knights-before-refresh.json` conserve les descriptions antérieures et `north-female-axe-before-fix.png` la précédente Guerrière. La comparaison chevalière précédente se trouve dans `public/validation/chevaliers/archives/avant.png`. Les atlas partagés ne doivent être supprimés qu’après vérification de leurs autres utilisateurs ; aucune suppression de ces sources n’a été effectuée.

## Vérifications

205 tests automatisés réussis (56 visuels et 149 systèmes), dont les six nouvelles identités, les poses propres à chaque équipement, la sélection des sexes et les sources utilisées sur carte et en combat. Le parcours navigateur balaie les 22 variantes, vérifie les tirs et sorts immobiles, les soins, les rechargements, l’absence de parade sans bouclier, le maintien des sauvegardes et les comparaisons sur mobile. Il vérifie également une ancienne association sauvegardée d’Épéiste féminin vers le profil partagé.
