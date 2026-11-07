# Correctifs V12 — Prologue et patrouille de Valdren

## Modifications

- Les modules canoniques du prologue sont maintenant `src/data/prologue.ts`, `src/game/prologue.ts` et `src/game/prologue-enemies.ts`. Les anciens chemins `chapter1` sont des réexports de compatibilité uniquement. Le champ JSON historique `chapter1` / `chapter1RulesVersion` reste conservé pour lire les sauvegardes existantes sans réécrire les créneaux ; il ne représente pas le numéro du chapitre. Le vrai chapitre 1 reste dans les modules `forest-chapter`.
- Le titre affiché du prologue est **Les Terres Égarées**. Aucun encart de chapitre, sous-titre ni mention « deux expéditions » n'est affiché en haut à gauche des cinématiques. Seul l'objectif reste pendant la bataille. Les écrans de transition dédiés conservent leurs titres.
- Le cadrage de la scène finale du prologue se décale vers le bas et réserve la hauteur réelle du dialogue. Sur écran étroit, un cadrage plus proche évite le blocage de caméra en limite de carte. Les unités réelles et le zoom des batailles ne changent pas.
- La présentation « Maëlys. Je m’appelle Maëlys. » est ajoutée après l'invitation validée, avant le départ. Le nom est utilisé après la présentation puis dans la fiche de Sorcière. Une unité existante portant le nom générique adopte seulement le prénom au chargement ; ses statistiques et capacités restent identiques.
- L'introduction devient « Sur le chemin de la grotte de Maëlys… ». Le panneau de portrait reste vide pour le narrateur ; aucun logo de remplacement. La grotte et les répliques narratives suivantes sont conservées, sauf le remplacement du nom générique.
- Les six alliés marchent en formation compacte sur deux rangs du sentier. Trois soldats, dont le capitaine, approchent sur des chemins de cases pendant l'avertissement de Maëlys et s'arrêtent à deux cases de la tête du groupe.
- Après l'ultimatum, une séquence distincte fait reculer le capitaine vers son commandement, répartit les soldats et fait entrer les renforts depuis les marges. Dézoom temporaire, puis reprise du cadrage de jeu normal. Les trajets utilisent le cheminement existant et les animations disponibles. Les positions sont engagées à la fin de chaque séquence, sans jouer de tour ni recalculer l'initiative. Les deux lecteurs doivent avoir terminé avant le passage à la bataille.
- Choix coopératif dans un panneau opaque en bas, avec « Que répondez-vous ? », « Mettez-vous d’accord. », les deux réponses et l'indication du désaccord. Chaque joueur peut modifier son vote ; seul l'accord commun avance.
- Le test local réutilise le rendu de carte pour une deuxième vue côte à côte au moment du vote, sur grand écran. Sur mobile, une seule carte et les deux panneaux de vote restent lisibles. En mode de session propriétaire, seule la sélection de son joueur est proposée. Aucun second réseau ni faux serveur multijoueur.

## Rencontre et IA

Onze ennemis dans une nouvelle partie du chapitre : quatre Hommes d'armes, trois Lanciers, deux Arbalétriers, Géraud (Écuyer), plus le capitaine utilisant la classe Homme d'armes. Soldats niveau 1, capitaine niveau 3. Les coefficients de combat et les statistiques des classes restent inchangés ; la patrouille conserve les réglages de rencontre précédents. Géraud compte dans les dix soldats et son recrutement conditionnel reste identique.

Avant-garde active, deux groupes défensifs à détection permanente sur les deux itinéraires, et capitaine immobile jusqu'aux premiers dégâts. Les défenseurs s'activent ensemble lorsque les héros entrent dans la zone ou menacent un membre ; des dégâts reçus alertent aussi le groupe. Le capitaine peut attaquer une cible à portée sans poursuivre. Une vraie perte de PV débloque définitivement son déplacement, même après soin et sauvegarde. Une prévision, une esquive ou une parade sans perte de PV ne le débloquent pas.

Les paramètres `enemyAI` par unité et `enemyGroups` par campagne sont réutilisables : actif, zone, boss ou planificateur de mission enregistré. Les unités anciennes sans ces paramètres conservent leur comportement validé, notamment les Sans-Repos du prologue.

La carte forestière 60 × 40, ses textures et ses décors sont inchangés. Le combat utilise un front plus resserré, plusieurs groupes et les chemins secondaires ; la marge de forêt sert à l'entrée des renforts. Aucune image, aucun sprite et aucune animation nouveaux ne sont générés.

## Sauvegardes et tests

Aucune remise à zéro automatique des sauvegardes normales ou du test séparé. Une bataille V11 reprise conserve ses unités, ses positions et son initiative ; les onze soldats et les nouvelles mises en scène concernent un nouveau lancement du chapitre. Les anciens fichiers d'import restent valides.

Vérifications ciblées : composition/niveaux, formation sur route, chemins continus sans mutation par le rendu, points d'arrêt, déploiement et initiative, reprise d'une ancienne bataille, zones indépendantes et persistantes, boss (raté/parade/dégâts/soin/reprise), exception de mission et acquittements coopératifs. Parcours navigateur : cadrage bureau/mobile, présentation de Maëlys, narrateur vide, approche, vote/désaccord/deux vues, déploiement/dézoom et retour au combat. Régressions du recrutement de Géraud, des deux branches, de la grotte et du créneau de sauvegarde normal. Suite moteur/ressources et compilations publique/prototype.

Limite volontaire : l'écran scindé est un outil local. Le transport Cloudflare réel reste une étape ultérieure, comme dans la version précédente. Les zones de détection ne sont pas dessinées sur la carte.
