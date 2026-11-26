# Mise à jour graphique et scénario — chapitres I et II

## Résultat et périmètre

Le chapitre I propose les deux branches existantes. La réponse « vagabonds » mène à une attaque scénarisée contre Maëlys : esquive, riposte critique, mort d’un garde réel de la patrouille, puis déploiement et bataille. La réponse « tempêtes rouges » conserve sa confrontation et le recrutement conditionnel de Géraud, sans cette attaque. Les dialogues de victoire sont distincts et ne rejouent pas les souvenirs de Géraud.

Le titre « Chapitre II — Un ennemi commun » précède l’arrivée dans la grotte. Maëlys explique les tempêtes, les Écorcheurs et la captivité de sa sœur ; trois figurants narratifs arrivent, leur porte-parole apprend pendant la conversation qui a attaqué la patrouille, puis l’alliance temporaire est enregistrée et le groupe quitte le refuge. Le développement s’arrête dans un bilan sauvegardable. Aucun terrain de camp, ordre de bataille, objectif, prisonnier supplémentaire, recrutement futur ou fin de bataille du chapitre II n’a été créé.

## Analyse et systèmes réutilisés

- Le prologue est conservé sous sa clé historique `chapter1` pour les sauvegardes. Le chapitre I réel reste `forestChapter` ; `chapter2` stocke la nouvelle introduction.
- Le vote commun, les révisions de choix, les acquittements par les deux lecteurs et la mise en place `PatrolStaging` sont conservés.
- Les dialogues utilisent les rôles résolus vers les unités survivantes, leurs noms personnalisés et leurs portraits enregistrés. Maëlys et Géraud gardent leurs identités et portraits réservés.
- La scène forcée réutilise `CombatSceneV2` et ses effets communs. Elle reçoit deux résultats explicites et ne consulte ni statistiques ni générateur aléatoire. Aucun XP, équipement, inventaire ou niveau n’est modifié. Le garde est retiré des queues et mis à zéro PV après le dernier acquittement ; il ne participe plus à la bataille.
- Les mouvements narratifs sont des couches de présentation : les positions, caractéristiques et inventaires du groupe ne sont pas reconstruits pour le chapitre II. Les Écorcheurs de la grotte restent des figurants hors du roster de combat.
- Les sauvegardes antérieures restent lisibles. Un ancien bilan du chapitre I peut poursuivre vers le chapitre II ; une ancienne scène de grotte en cours rejoint la nouvelle conclusion de branche. Les connaissances déjà révélées dans les anciens bilans sont conservées dans la biographie.

## Ressources graphiques réellement disponibles

Aucune nouvelle archive n’était jointe à cette demande. L’intégration emploie les ressources déjà présentes, issues des comparaisons précédentes. Les animations des 22 variantes de base étaient déjà actives et ont été vérifiées.

Vingt-et-une nouvelles apparences évoluées sont activées pour le repos sur carte, les aperçus et la garde de combat : Berserker H/F, Brise-fer H/F, Huscarl hache/bouclier et épée/bouclier H/F, Drengr H, Guérisseur du clan avec ces deux équipements H/F, Garde d’honneur H/F, Traqueur arc et hache H/F, Hamrammr humain H/F avec cape et capuche d’ours. Les autres apparences déjà utilisées, dont les Chevaliers évolués présentés lors de la comparaison, restent celles du projet : aucune planche supplémentaire n’a été inventée.

Les gardes sont exportées à leur résolution native, sans étirement, avec huit pixels de marge transparente, des masques de silhouette, des pieds/ancrages et des références de hauteur explicites. Ces 21 exports totalisent environ 1,6 Mio au lieu de 43 Mio de planches complètes chargées pour une seule pose. Les associations sont tracées dans `docs/references/official-advanced-integration.json`.

**Limite volontaire :** les déplacements et actions avancées non terminés continuent à utiliser les anciennes planches. Leur ancien costume peut donc réapparaître pendant l’action. Elles ne sont pas présentées comme de nouvelles animations finalisées. Les ressources anciennes encore employées sont conservées ; les attaques réalistes des lanciers et la cohérence des deux épées du Duelliste restent au carnet de travail.

## Vérifications réalisées

- **237 tests automatisés réussis** : bibliothèque graphique, règles existantes, progression, inventaires, portraits, sauvegardes, deux branches avec factions inversées, recrutement de Géraud, résultat forcé avec statistiques adverses, conservation du groupe et limite de développement.
- **32 essais navigateur ciblés réussis** : six pour cette intégration (branches et combat de Maëlys, titre/grotte/Écorcheurs/départ, 21 gardes en bleu/rose et reprise d’une unité évoluée, deux vues coopératives, sauvegarde/reprise sur téléphone), quatorze pour les combats des classes de base, un pour les deux créations sur téléphone, deux pour les portraits/dialogues du prologue, quatre pour le rendu tactique et cinq pour le lecteur de comparaison.
- Compilation du prototype et contrôle de ses ressources réussis. Les exports sont contrôlés contre leurs dimensions PNG réelles et leurs marges.
- Captures de contrôle locales : scène de Maëlys, arrivée des Écorcheurs, départ mobile et bilan.

La coopération a été vérifiée sur deux vues recevant des snapshots et sur les barrières d’acquittement du moteur, y compris la sauvegarde à mi-acquittement. **Aucune connexion distante réelle ni serveur multijoueur n’a été vérifié** : le projet expose un adaptateur de session et de réception de snapshots, pas un transport réseau authentifié complet. La lecture des animations reste locale et la progression attend les deux joueurs.

## Raccourci de test ajouté le 26 novembre 2026

Le bouton **Tester chapitre 2** est directement visible sur l’accueil. Il propose **Tempêtes rouges · avec Géraud** et **Vagabonds**. Une campagne de test indépendante est préparée par les transitions officielles ; elle s’ouvre à la première réplique après la victoire du chapitre I, avant le titre du chapitre II. Le premier parcours a recruté Géraud ; le second conserve son absence. Les dialogues se poursuivent normalement jusqu’au départ de la grotte et au bilan « À suivre ».

Le raccourci ne lit ni n’écrit les sauvegardes existantes. Le gestionnaire habituel reste disponible pour enregistrer volontairement le test dans un nouvel emplacement.

Vérifications de cette addition : **239 tests automatisés réussis**, dont deux nouveaux parcours du raccourci avec sauvegarde/rechargement ; **deux parcours navigateur réussis** depuis le bouton (Tempêtes rouges sur ordinateur, Vagabonds sur téléphone), avec contrôle de l’annulation, des dialogues de fin, du titre, des trois scènes du chapitre II, de Géraud, du retour à l’accueil et de la conservation des emplacements existants. Compilation du prototype et contrôle des ressources réussis.

Fichiers de cette addition : `src/main.ts`, `src/game/chapter-two-review.ts`, `tests/chapter2-integration.test.ts`, `tests/chapter-two-review.spec.ts`, `playwright.story-update.config.ts` et ce compte rendu.

## Reproduction

- `npm test`
- `npx playwright test --config=playwright.story-update.config.ts`
- `npx playwright test --config=playwright.contact.config.ts`
- `npx playwright test --config=playwright.introduction.config.ts`
- `npx playwright test --config=playwright.dialogue.config.ts`
- `npx playwright test --config=playwright.campaign-polish.config.ts`
- `npx playwright test --config=playwright.advanced-refresh.config.ts`
- `npm run build:prototype -- --base=/Les-Terres-Egarees/` puis `npm run check:prototype`

Pour réexporter les gardes à partir des fichiers de comparaison : démarrer Vite au port 5173 et lancer `node scripts/install-reviewed-advanced.mjs`. Les anciennes séquences d’action restent dans les descripteurs ; les identifiants de classe/sexe/équipement ne changent pas.

## Fichiers modifiés ou ajoutés

- `docs/comparaison-vikings-evolues.md`
- `docs/mise-a-jour-chapitres-I-II.md`
- `docs/references/official-advanced-integration.json`
- `package.json`
- `playwright.story-update.config.ts`
- `public/validation/vikings-evolues/index.html`
- `public/validation/vikings-evolues/reprises/manifest.json`
- `public/validation/vikings-evolues/reprises/player.js`
- `scripts/compare-viking-advanced.mjs`
- `scripts/install-reviewed-advanced.mjs`
- `scripts/register-advanced-review.py`
- `src/assets/tactical/combat-v4-official-advanced-berserker-twin_axes-female.png`
- `src/assets/tactical/combat-v4-official-advanced-berserker-twin_axes-male.png`
- `src/assets/tactical/combat-v4-official-advanced-clan_healer-axe_shield-female.png`
- `src/assets/tactical/combat-v4-official-advanced-clan_healer-axe_shield-male.png`
- `src/assets/tactical/combat-v4-official-advanced-clan_healer-sword_shield-female.png`
- `src/assets/tactical/combat-v4-official-advanced-clan_healer-sword_shield-male.png`
- `src/assets/tactical/combat-v4-official-advanced-drengr-twin_swords-male.png`
- `src/assets/tactical/combat-v4-official-advanced-hamrammr-healing_focus-female.png`
- `src/assets/tactical/combat-v4-official-advanced-hamrammr-healing_focus-male.png`
- `src/assets/tactical/combat-v4-official-advanced-honor_guard-sword_shield-female.png`
- `src/assets/tactical/combat-v4-official-advanced-honor_guard-sword_shield-male.png`
- `src/assets/tactical/combat-v4-official-advanced-huscarl-axe_shield-female.png`
- `src/assets/tactical/combat-v4-official-advanced-huscarl-axe_shield-male.png`
- `src/assets/tactical/combat-v4-official-advanced-huscarl-sword_shield-female.png`
- `src/assets/tactical/combat-v4-official-advanced-huscarl-sword_shield-male.png`
- `src/assets/tactical/combat-v4-official-advanced-ironbreaker-great_axe-female.png`
- `src/assets/tactical/combat-v4-official-advanced-ironbreaker-great_axe-male.png`
- `src/assets/tactical/combat-v4-official-advanced-tracker-axe-female.png`
- `src/assets/tactical/combat-v4-official-advanced-tracker-axe-male.png`
- `src/assets/tactical/combat-v4-official-advanced-tracker-bow-female.png`
- `src/assets/tactical/combat-v4-official-advanced-tracker-bow-male.png`
- `src/assets/tactical/official-advanced-layouts.json`
- `src/assets/tactical/zzzzzzzzzzzzzzzz-official-advanced.combat.json`
- `src/assets/tactical/zzzzzzzzzzzzzzzz-official-advanced.sprite.json`
- `src/data/chapter2.ts`
- `src/data/forest-chapter.ts`
- `src/data/prologue.ts`
- `src/engine.ts`
- `src/game/chapter2.ts`
- `src/game/cooperation.ts`
- `src/game/forest-chapter.ts`
- `src/game/manual-saves.ts`
- `src/game/portraits.ts`
- `src/game/prologue.ts`
- `src/game/save.ts`
- `src/game/types.ts`
- `src/main.ts`
- `src/sprites/geometry.ts`
- `src/sprites/resources.ts`
- `src/style.css`
- `src/ui/chapter-dialogue.ts`
- `src/ui/character-sheet.ts`
- `src/ui/combat-v2.ts`
- `tests/chapter2-integration.test.ts`
- `tests/combat-v2.test.ts`
- `tests/combat-v4.test.ts`
- `tests/combat-v5.test.ts`
- `tests/cooperative-story-update.spec.ts`
- `tests/forest-chapter.test.ts`
- `tests/official-skins.test.ts`
- `tests/patrol-v12.test.ts`
- `tests/story-update.spec.ts`
