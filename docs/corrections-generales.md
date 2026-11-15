# Corrections générales : création, portraits et sauvegardes

## Résultat

- Nouvelle partie → Jouer solo → factions → paramètres des deux héros (dont les couleurs) → introduction propre à chaque faction → visage → compagnons → prologue existant. Le bouton « Jouer avec un ami » est désactivé et marqué « à venir ».
- Menus de création compacts, panneaux côte à côte, commandes accessibles sur ordinateur et téléphone. Les outils du prototype restent accessibles dans une section repliable du titre.
- RRR et RRTT restent les PNG fournis. Cadrage `cover` sans étirement ; le décor Viking privilégie le bord gauche pour conserver le bateau. En portrait, le cadrage rogne surtout la forêt de droite. Les personnages sont sur une couche séparée.
- Les deux mises en scène sont inversées : Chevaliers depuis la gauche, Vikings depuis la droite. Deux figurants et une brume discrète animent chaque accueil. Ils ne deviennent jamais des unités de campagne et ne réservent aucun portrait.
- Le héros rejoint le groupe après validation du visage ; son portrait change de côté. Les candidats n'exposent que leur nom, classe et sexe. Les portraits des compagnons n'apparaissent qu'après confirmation et restent cohérents avec ceux de la campagne.
- Fenêtres FE8 et textes existants conservés. Portraits légèrement réduits, proportions préservées, marges et quatre positions avant/arrière à gauche/droite. L'interlocuteur actif passe devant. Les positions s'adaptent au téléphone.

## Portraits et recoloration

Les 33 portraits importés restent inchangés : 12 Chevaliers (7 hommes, 5 femmes), 12 Vikings (6 hommes, 6 femmes), 5 génériques et 4 prédéfinis. Aucun portrait supplémentaire n'est généré.

Le rendu commun des portraits enlève le fond bleu nuit connecté aux bords, avec une protection de la silhouette du buste pour ne plus effacer les tissus et armures sombres. Les espaces de fond entre les cheveux restent traités par connexité. Deux petites bandes provenant du bord des planches C07 et R03 sont exclues à l'affichage. Le même rendu est utilisé dans les dialogues, fiches, introductions et bilans. Le fichier source reste référencé dans `data-portrait-source` et son identité enregistrée ne change jamais.

Seul le foulard de Géraud bénéficie d'une recoloration : région explicitement délimitée sur R03, sélection des tons bleus suffisamment saturés, luminance conservée. Le visage, les cheveux, les yeux, les métaux et le doré sont exclus. Rose dans le camp adverse ; couleur de son propriétaire après recrutement, dans la fiche comme dans les dialogues. Les autres portraits gardent leurs couleurs originales : la séparation de leurs marques, tissus, fourrures et ornements serait trop incertaine sans masques artistiques supplémentaires.

Les portraits Maëlys/R01, sa sœur/R02, Géraud/R03 et Atalia/R04 restent réservés. Les associations des personnages nommés sont conservées.

## Capitaine Aldric

`src/data/narrative-plan.json` confirme explicitement « capitaine Aldric », commandant la patrouille de Valdren au chapitre 1. Le code employait le titre territorial « Capitaine de Valdren » et masquait son nom personnel derrière la faction.

Son nom devient « Capitaine Aldric » ; son identifiant reste `valdren-captain`. Les anciennes sauvegardes sont adaptées **en mémoire au chargement**, uniquement pour cet ancien libellé. Aucun dialogue, événement, recrutement ou attribut de combat ne change. Un nouveau capitaine reçoit N04 (casque fermé) et les soldats ordinaires N03. Si une ancienne partie lui avait attribué N03, elle conserve cette association et ses soldats utilisent N04.

## Sauvegardes exclusivement manuelles

Le bouton Sauvegarder du menu de partie et des dialogues stables ouvre le gestionnaire. Il permet :

- de créer plusieurs emplacements avec un nom personnalisé ;
- de charger une partie ;
- de renommer un emplacement ;
- d'écraser ou supprimer après confirmation explicite ;
- de consulter la date, le chapitre, le tour et la progression disponibles.

Le catalogue est stocké dans `lte-manual-saves-v1`, enveloppe version 1. Chaque emplacement possède un identifiant indépendant, ses dates, métadonnées et l'état complet de campagne sérialisé par le système existant : portraits, inventaires, équipes, unités, positions, caractéristiques, initiative, événements, recrutement, cartes et progression. La sérialisation se fait sur une copie, sans modifier la campagne.

**Aucune écriture de progression automatique ne subsiste** : ni fin de tour, ni recrutement, ni chapitre, ni titre, ni rechargement, ni fermeture d'onglet. Charger ne modifie jamais le catalogue ou son emplacement source. Les changements joués sans sauvegarder restent uniquement dans la partie en cours.

Les anciennes clés `lte-save`, `lte-chapter-one-test` et `lte-chapter-one-start` restent intactes et sont chargeables depuis le gestionnaire. Pour les convertir en emplacement nommé, les charger puis créer explicitement une sauvegarde. Le checkpoint de redémarrage du test chapitre 1 est désormais uniquement en mémoire.

Les écritures du catalogue sont atomiques ; un quota dépassé ou un format futur/incompatible produit une erreur et conserve les données existantes. Les préférences explicitement appliquées et les documents de l'éditeur restent enregistrables indépendamment des sauvegardes de partie.

Les actions tactiques ou transitions non stables doivent être terminées avant de sauvegarder. Ce sont des sauvegardes locales au navigateur, sans synchronisation réseau. Le mode multijoueur reste volontairement non implémenté.

## Fichiers principaux

- `src/game/manual-saves.ts`, `src/ui/save-manager.ts` : emplacements manuels, validation et confirmations.
- `src/main.ts` : suppression des écritures automatiques, chargement, menus, commandes de sauvegarde.
- `src/ui/creator.ts`, `src/ui/introduction-scene.ts`, `src/ui/introduction-layout.ts` : création et mise en scène des deux départs.
- `src/ui/portrait-mask.ts`, `src/ui/portraits.ts`, `src/ui/character-sheet.ts` : transparence commune et foulard de Géraud.
- `src/ui/dialogue-presentation.ts`, `src/ui/chapter-dialogue.ts`, `src/style.css` : positions des portraits et adaptation des écrans.
- `src/game/forest-chapter.ts`, `src/game/portraits.ts`, `src/game/save.ts` : nom confirmé du capitaine, casque distinct et compatibilité des anciennes parties.
- Tests associés et `playwright.corrections.config.ts`.

## Vérifications

- `npm test` : **182 tests réussis** (42 rendu, 140 systèmes), dont les emplacements indépendants, chargement sans écriture, plusieurs tours moteur sans sauvegarder, format futur, quota, migration du capitaine et quatre positions de dialogue.
- `npx playwright test --config=playwright.corrections.config.ts` : **9 tests réussis**. Les deux introductions sont parcourues jusqu'au prologue ; personnages masculins/féminins, flèches, candidats cachés, apparitions, sauvegarde et reprise sont vérifiés. Dialogues à un/deux interlocuteurs et avec un ennemi, fiches et 33 portraits transparents, Géraud ennemi/allié, opérations de sauvegarde et trois résolutions (1280×800, 390×844, 844×390) sont couverts.
- `npm run build` et `npm run check:public` : réussis.
- Build prototype avec la base `/Les-Terres-Egarees/`, puis contrôle `check-public --prototype` : réussis.
- Le test des sauvegardes a aussi été rejoué après fermeture réelle de l’onglet et ouverture d’un nouvel onglet dans le même navigateur : deux tests réussis (sauvegardes et résolutions).
- Les originaux des portraits, décors, sprites, cartes et captures suivies par Git ne sont pas modifiés.

Les anciennes suites navigateur historiques qui reposent sur les anciens menus n'ont pas toutes été exécutées ; les vérifications navigateur ciblées ci-dessus couvrent les parcours modifiés. La recoloration des autres portraits est volontairement laissée de côté. L'identité des sprites et des portraits reste séparée ; aucun sprite miniature n'est utilisé pour remplacer un portrait manquant.
