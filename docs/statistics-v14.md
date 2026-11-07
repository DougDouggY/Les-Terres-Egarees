# V14 — Caméra, fiches et statistiques individuelles

## Changements

- Déploiement : après l'arrivée des soldats, maintien du dézoom pendant 2 secondes puis retour interpolé sur 800 ms. Aucun allongement des trajets.
- Roulette sur les seules cartes de bataille : zoom 0,8 à 3, avec conservation du point sous le curseur dans la limite des bords. La valeur reste active pendant la bataille ; menus, fiches et dialogues conservent leur défilement.
- Fiches plus hautes, adaptatives, sans portrait ni initiale. L'expérience est réservée aux unités contrôlables. Les valeurs affichées restent celles de l'unité réelle.
- `generateStatistics` centralise la génération de profils normaux (`principal`, `recruitable`), ordinaires (`ordinary`, ennemis comme alliés IA), et boss (`boss`). L'appartenance à une équipe ne détermine pas le statut : un recrutable hostile conserve un profil normal.
- Baseline ordinaire : PV réduits de 10 % avec minimum de 2 PV, force −1, défense −2 si sa référence atteint 6, sinon −1. Aucune réduction de mobilité, vision, portée, précision, agilité ou initiative. Ces réductions précèdent les variations existantes (PV ±2 ; autres caractéristiques de progression ±1 avec somme équilibrée).
- Graine stable par identifiant et classe ; croissance avec `gainLevel`, identique aux personnages jouables. Niveau N = N−1 tirages de montée de niveau. Les plafonds et taux existants s'appliquent.
- Chapitre 1 : suppression des valeurs communes forcées. Soldats ordinaires individualisés selon leur classe ; Géraud normal dès sa création ; capitaine de classe Homme d'armes généré au niveau 3. Les caractéristiques structurelles retrouvent leurs références de classe.
- Les boss peuvent définir des valeurs explicites via `overrides`. Le futur allié IA ordinaire utilise le même rôle `ordinary`, sans système parallèle.
- Génération uniquement à la création : aucune migration des caractéristiques déjà enregistrées, aucun recalcul au chargement ou recrutement. Les anciennes parties conservent donc leurs anciennes statistiques ; relancer un nouveau test pour observer les nouveaux profils.

## Périmètre

Cartes, placements, dialogues, sprites, règles de combat, croissance, initiative et fichiers de sauvegarde conservés. Pas de nouvelle ressource graphique. Les futurs chapitres peuvent appeler le générateur avec un rôle explicite ; aucun chapitre supplémentaire créé.

## Vérifications

Tests ciblés : 100 paires de profils ordinaires/normaux, diversité et déterminisme, caractéristiques structurelles inchangées, trois montées de niveau exactes pour un niveau 4, conservation des statistiques après sauvegarde/chargement et recrutement, héros existants préservés. Régressions moteur et interface du chapitre ; compilations publique et prototype et contrôles de séparation des outils de développement.

Résultats : suite automatique complète réussie ; six contrôles navigateur de régression du chapitre (le test de déploiement adapté attend la fin des activations initiales), plus contrôle dédié roulette/fiche sur écrans 1440×1000 et 800×600. Versions publique et prototype compilées et contrôlées. Avertissement Vite préexistant sur la taille du bundle.
