# V16 — Magie, progression, cadrage et préparation des combats

- Soigner dépend désormais de la capacité de la classe et de sa forme, sans imposer le focus de soin comme arme active. Les classes hybrides conservent leur magie offensive. Les anciens états sauvegardés avec un focus actif donnent également accès à leur magie offensive ; aucun changement manuel requis. Le Chaman reste soigneur, et la forme animale du Hamrammr ne peut pas soigner. Aucun nouveau pouvoir ajouté.
- L'interface ne change plus l'équipement pour cibler un soin. Le sélecteur d'équipement des classes hybrides ne propose plus le focus comme un mode à activer.
- L'XP reste centrée pendant sa progression. En cas de montée de niveau, elle se décale et les gains apparaissent automatiquement à côté, sans premier clic Continuer. Les gains successifs puis les valeurs finales sont conservés. Un seul bouton termine l'ensemble. Sur petits écrans, les panneaux se disposent verticalement.
- Le combat conserve un champ proportionné 960×600, limité à 1120 pixels de largeur et à l'espace vertical disponible. La même règle s'applique au prologue et à la forêt, sans changement d'échelle anatomique par pose.
- Les premières lignes de dialogue ne sont plus retardées par le préchargement graphique. Le démarrage effectif des déplacements attend toujours les sprites pour éviter les sauts. Les routes scénarisées sont mises en cache par campagne et composition.
- Pendant les temps libres de la carte, le combattant actif et ses adversaires visibles les plus proches bénéficient d'un préchargement progressif de leurs ressources. Les décors sont préchargés et décodés avant le début de la scène. Aucun ennemi caché n'est révélé. Ces mesures réduisent les attentes, sans garantir l'absence de ralentissement sur tout matériel.
- Valdren : `valdren-6` (Homme d'armes) et `valdren-9` (Arbalétrier), à l'arrière, passent au niveau 2 par la progression existante. Le capitaine reste niveau 3 et Géraud niveau 1. Composition et positions inchangées.
- Lorsqu'un Écuyer atteint le niveau 10 et choisit sa classe suivante, il revient au niveau 1 avec ses gains conservés et un minimum égal à la référence de la nouvelle classe +2 PV, +1 force et +1 défense. Agilité, initiative et précision atteignent au moins la référence. Mobilité, vision et équipement suivent la classe choisie. Les blessures sont conservées en nombre de PV manquants. Le mécanisme s'applique aux évolutions de recrues, sans réécriture des personnages déjà promus.

## Vérifications

Tests moteur : soins et attaques pour Sorcier, Völva, Archimage et Nécromancien, y compris anciens états de focus ; deux évolutions possibles de l'Écuyer et conservation des gains ; exactement deux soldats de niveau 2 et capitaine de niveau 3. Suite automatique existante conservée, assertion historique des niveaux adaptée.

Chromium : soin direct et XP → niveau sans clic intermédiaire, absence de chevauchement des panneaux, cadrage 1,6 et largeur maximale, premier texte pendant un chargement graphique ralenti, non-régression des déplacements scénarisés sous blocage simulé et du survol allié. Captures dans `artifacts/magic-v16`.

Compilations publique et prototype, avec contrôle des outils de développement. Aucune nouvelle image ni modification de carte, dialogues, sauvegardes ou règles de dégâts. Les niveaux ennemis s'appliquent à un nouveau test du chapitre ; les sauvegardes gardent leurs unités déjà générées.
