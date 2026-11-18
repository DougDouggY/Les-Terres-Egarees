# Modèle de remplacement des personnages

La structure est réutilisable, pas les dessins : chaque classe, sexe et équipement doit garder sa propre identité. Cette liste décrit les profils présents, pas un diagnostic affirmant que tous leurs dessins sont défectueux.

## Priorité proposée

1. Pillarde hache-bouclier (raider:female:axe-shield:default).
2. Pillarde épée-bouclier (raider:female:sword-shield:default).
3. Huscarl féminine hache-bouclier puis épée-bouclier (classe appelée « Ulfkarl » dans la discussion ; identifiant actuel huscarl).
4. Guérisseuse du clan féminine, hache-bouclier puis épée-bouclier. Ajouter le geste de bandage.
5. Porte-étendard masculin dans une fiche distincte : bannière portée/plantée et changement d’arme à conserver.

## Même famille de mouvements : fantassins avec bouclier

Sexe : male = masculin, female = féminin, any = dessin partagé dans les données actuelles.

Attente, approche, attaque réutilisée pour la riposte et la seconde frappe, parade, esquive, dégâts, mort. Critique par effet partagé sans nouveau dessin. Les coups d’épée doivent être redessinés pour une épée ; ne pas simplement remplacer une hache dans une trajectoire incompatible. Huscarl : conserver l’interception ; Guérisseur : conserver les bandages.

| Classe | Sexe du profil | Équipement | État | Capacités à garder |
|---|---|---|---|---|
| Pillard (raider) | male | axe-shield | default | — |
| Pillard (raider) | female | axe-shield | default | — |
| Homme d’armes (man_at_arms) | male | sword-shield | default | — |
| Homme d’armes (man_at_arms) | female | sword-shield | default | — |
| Pillard (raider) | male | sword-shield | default | — |
| Garde en armure (sans_guard) | any | sword-shield | default | — |
| Huscarl (huscarl) | male | axe-shield | default | parry, intercept |
| Guérisseur du clan (clan_healer) | male | axe-shield | default | bandage |
| Garde d’honneur (honor_guard) | any | sword-shield | default | parry, defense_aura |
| Chevalier de la garde (guard_knight) | any | sword-shield | default | parry |
| Guérisseur du clan (clan_healer) | male | sword-shield | default | bandage |
| Huscarl (huscarl) | male | sword-shield | default | parry, intercept |
| Huscarl (huscarl) | female | axe-shield | default | parry, intercept |
| Huscarl (huscarl) | female | sword-shield | default | parry, intercept |
| Guérisseur du clan (clan_healer) | female | axe-shield | default | bandage |
| Guérisseur du clan (clan_healer) | female | sword-shield | default | bandage |
| Pillard (raider) | female | sword-shield | default | — |

## Même tronc de mouvements, gestuelle à adapter

Armes sans bouclier ou lances : ne pas copier le geste de parade au bouclier ni le maniement de la hache. La logique du combat est commune ; les dessins restent propres à l’arme et aux capacités.

| Classe | Sexe du profil | Équipement | État | Capacités à garder |
|---|---|---|---|---|
| Cavalier spectral (sans_rider) | any | lance | default | — |
| Brise-fer (ironbreaker) | male | great-axe | default | pierce |
| Guerrier du Nord (north_warrior) | male | axe | default | — |
| Lame nordique (nordic_blade) | male | sword | default | — |
| Lancier (spearman) | any | lance | default | — |
| Épéiste (swordsman) | any | sword | default | — |
| Squelette hacheur (sans_axe) | any | axe | default | — |
| Squelette lancier (sans_spear) | any | lance | default | — |
| Garde royal (royal_guard) | any | lance-shield | default | parry |
| Traqueur (tracker) | male | axe | default | forest_move |
| Rôdeur (ranger) | male | sword | default | forest_move |
| Guerrier du Nord (north_warrior) | female | axe | default | — |
| Lame nordique (nordic_blade) | female | sword | default | — |
| Brise-fer (ironbreaker) | female | great-axe | default | pierce |
| Traqueur (tracker) | female | axe | default | forest_move |
| Rôdeur (ranger) | female | sword | default | forest_move |

## Autres familles, à ne pas forcer dans ce modèle

Tireurs : tir et recharge ; soigneurs/mages : soins ou sorts ; doubles armes : seconde main ; cavaliers : monture et charge ; porte-étendards : bannière portée/plantée ; formes animales et états spéciaux : planches distinctes.

| Classe | Sexe du profil | Équipement | État | Capacités à garder |
|---|---|---|---|---|
| Cavalier (cavalry) | any | sword-shield | default | — |
| Lancier monté (mounted_spearman) | any | lance | default | charge |
| Porte-étendard (standard_bearer) | male | banner | carried | banner |
| Porte-étendard (standard_bearer) | male | sword | planted | banner |
| Arbalétrier à pavois (pavise_crossbowman) | male | crossbow | default | fortify |
| Arbalétrier à pavois (pavise_crossbowman) | male | crossbow | fortified | fortify |
| Exécuteur (executioner) | any | great-sword | default | — |
| Berserker (berserker) | male | dual-axes | default | dual |
| Drengr (drengr) | male | dual-swords | default | dual |
| Chasseur (hunter) | female | bow | default | — |
| Arbalétrier (crossbowman) | male | crossbow | default | — |
| Chaman (shaman) | male | healing | default | heal |
| Sorcier (sorcerer) | male | spell | default | heal |
| Squelette épéiste (skeleton) | any | rusty-sword | default | — |
| Archer décharné (sans_archer) | any | bow | default | — |
| Arbalétrier décharné (sans_crossbow) | any | crossbow | default | — |
| Nécromancien ennemi (sans_necromancer) | any | spell | default | summon |
| Nécromancien (necromancer) | male | spell | default | heal, summon |
| Archimage (archmage) | male | spell | default | heal, area |
| Grand chasseur (master_hunter) | female | bow | default | long_range |
| Traqueur (tracker) | male | bow | default | forest_move |
| Rôdeur (ranger) | male | crossbow | default | forest_move |
| Duelliste (duelist) | male | dual-swords | default | dual |
| Jeune Viking (young_viking) | male | training-axe | default | — |
| Écuyer (squire) | male | training-sword | default | — |
| Sorcier (sorcerer) | male | healing | default | heal |
| Nécromancien (necromancer) | male | healing | default | heal, summon |
| Archimage (archmage) | male | healing | default | heal, area |
| Völva (volva) | male | spell | default | heal, buff |
| Völva (volva) | male | healing | default | heal, buff |
| Hamrammr (hamrammr) | male | healing | default | heal, transform |
| Hamrammr (hamrammr) | any | claws | bear | heal, transform |
| Chaman (shaman) | female | healing | default | heal |
| Sorcier (sorcerer) | female | spell | default | heal |
| Sorcier (sorcerer) | female | healing | default | heal |
| Nécromancien (necromancer) | female | spell | default | heal, summon |
| Nécromancien (necromancer) | female | healing | default | heal, summon |
| Archimage (archmage) | female | spell | default | heal, area |
| Archimage (archmage) | female | healing | default | heal, area |
| Völva (volva) | female | spell | default | heal, buff |
| Völva (volva) | female | healing | default | heal, buff |
| Hamrammr (hamrammr) | female | healing | default | heal, transform |
| Berserker (berserker) | female | dual-axes | default | dual |
| Drengr (drengr) | female | dual-swords | default | dual |
| Duelliste (duelist) | female | dual-swords | default | dual |
| Jeune Viking (young_viking) | female | training-axe | default | — |
| Arbalétrier (crossbowman) | female | crossbow | default | — |
| Arbalétrier à pavois (pavise_crossbowman) | female | crossbow | default | fortify |
| Arbalétrier à pavois (pavise_crossbowman) | female | crossbow | fortified | fortify |
| Traqueur (tracker) | female | bow | default | forest_move |
| Rôdeur (ranger) | female | crossbow | default | forest_move |
| Porte-étendard (standard_bearer) | female | banner | carried | banner |
| Porte-étendard (standard_bearer) | female | sword | planted | banner |
| Écuyer (squire) | female | training-sword | default | — |
| Chasseur (hunter) | male | bow | default | — |
| Grand chasseur (master_hunter) | male | bow | default | long_range |

## Fichiers à envoyer

- PNG original transparent, sans compression JPEG, texte, décor ou damier.
- Modèle : 2560 × 2560 px, 8 × 8 cases carrées de 320 px. Garder les cases inutilisées transparentes. Une autre résolution reste adaptable si la grille 8 × 8 est régulière ; privilégier une image assez définie pour ne pas retrouver le flou actuel.
- Lignes : attente carte 2 poses ; garde combat 2 ; pas rapides 4 ; attaque 8 ; parade 3 ; esquive 3 ; dégâts 3 ; mort 1.
- Pieds au repère 280 px, même axe et proportions, personnage orienté à droite ; le jeu peut le retourner.
- Armes, boucliers, cheveux et cape entièrement dans chaque case ; aucun membre ou détail coupé.
- Garder une seule tenue et le même visage entre toutes les poses. Pas de poses de critique, riposte ou seconde attaque en double.
- Fournir aussi les gestes spéciaux de la classe sur une planche séparée.

Oui, une planche produite avec Chat peut être intégrée. Il faudra vérifier la grille, les poses, la transparence, l’échelle, l’arme et les ancrages ; on ne peut pas promettre zéro défaut d’image avant de l’examiner. Le modèle facilite cette vérification et évite de reconstruire les séquences.
