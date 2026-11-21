# Corrections des classes de base

- Lame nordique féminine et Chasseur masculin : nouvelles planches utilisées en création, sur la carte et en combat. Les portraits de dialogue ne changent pas.
- Hommes d’armes homme/femme : attente à pieds fixes avec respiration légère, cadence déclarée respectée dans l’introduction, distance anatomique au contact accrue.
- Épéistes homme/femme : frappe au buste ; Lanciers : estoc horizontal partagé par les deux sexes.
- Sorciers homme/femme : bâton tendu, main libre, orbe de lancement annoté pour chaque pose. La charge suit l’orbe ; le projectile part de son extrémité, grossit puis explose. Même effet dans la campagne et l’essai.
- Les déplacements, soins, défenses et morts déjà disponibles des Chevaliers sont conservés. Les mélanges de sources sont explicitement autorisés uniquement pour ces profils contrôlés ; la mise à l’écart des autres sources incompatibles reste active.
- Les anciens fichiers restent disponibles ; leurs associations antérieures sont archivées dans `art-archive/before-combat-refinements.json`.
- Les poses dont l’arme touche le bord de la source ne sont pas utilisées. La riposte et la seconde frappe réutilisent l’attaque.

## Vérifications

206 tests automatiques réussis (57 visuels et 149 systèmes). Sept parcours navigateur réussis : les 22 variantes de base, sélection et sources identiques à la campagne, vitesse/pause/rejeu, attaques et soins, parade réservée aux boucliers, affichage mobile et comparaisons. Un huitième test navigateur vérifie les deux Sorciers, le suivi de l’orbe, la croissance du projectile et l’explosion. Un neuvième vérifie les introductions des deux factions et leur présentation sur téléphone. Les tests de sauvegarde existants passent ; le test d’essai vérifie que les sauvegardes restent inchangées.

Les essais ne remplacent pas la validation visuelle en partie par le joueur. Aucune modification des règles de dégâts, classes, recrutements, cartes ou dialogues.

## Fichiers principaux

Ressources et métadonnées : sept `src/assets/tactical/combat-v4-refinements-*.png`, `zzzzzzzzzzzzz-combat-refinements.{sprite,combat}.json`, `atlas-layout.json`, `combat-anchors.json`. Script de mesure : `scripts/register-combat-refinements.py` (lecture des pixels pour géométrie, aucune réécriture des PNG).

Affichage : `src/ui/introduction-scene.ts`, `combat-v2.ts`, `combat-effects.ts`, `contact-preview.ts`, `contact-roster.ts` ; `src/sprites/geometry.ts`, `weapon-point.ts`, `catalog.ts`, `combat-skin-core.ts`, `resources.ts`.

Comparaisons : `public/validation/vikings/`, `public/validation/chevaliers/`, leurs planches d’animations et scripts d’export. Tests : `tests/contact-trial.test.ts`, `contact-preview.spec.ts`, `visual-library.test.ts`.
