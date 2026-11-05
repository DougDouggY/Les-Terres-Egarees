# Inventaire V3 — classes, promotions et animations

Les 41 entrées visuelles et 55 profils sont parcourus. Une pose présente, une réutilisation et un dessin encore manquant sont distingués ; le passage des tests ne certifie pas une finition artistique parfaite.

Voir [le bilan des corrections](COMBAT-V3-REPORT.md) et [les ressources et cellules réellement utilisées](COMBAT-V3-ART.json).

## Classes et promotions

| Classe | Faction / stade | Profils | Variantes de sexe absentes |
| --- | --- | --- | --- |
| Guerrier du Nord | north / base | 1 | female |
| Berserker | north / advanced | 1 | female |
| Brise-fer | north / advanced | 1 | female |
| Pillard | north / base | 3 | — |
| Huscarl | north / advanced | 2 | female |
| Guérisseur du clan | north / advanced | 2 | female |
| Lame nordique | north / base | 1 | female |
| Drengr | north / advanced | 1 | female |
| Garde d’honneur | north / advanced | 1 | — |
| Chasseur | north / base | 1 | male |
| Grand chasseur | north / advanced | 1 | male |
| Traqueur | north / advanced | 2 | female |
| Chaman | north / base | 1 | female |
| Homme d’armes | knight / base | 2 | — |
| Chevalier de la garde | knight / advanced | 1 | — |
| Cavalier | knight / advanced | 1 | — |
| Lancier | knight / base | 1 | — |
| Garde royal | knight / advanced | 1 | — |
| Lancier monté | knight / advanced | 1 | — |
| Porte-étendard | knight / advanced | 2 | female |
| Arbalétrier | knight / base | 1 | female |
| Rôdeur | knight / advanced | 2 | female |
| Arbalétrier à pavois | knight / advanced | 2 | female |
| Épéiste | knight / base | 1 | — |
| Duelliste | knight / advanced | 1 | female |
| Exécuteur | knight / advanced | 1 | — |
| Sorcier | knight / base | 2 | female |
| Nécromancien | knight / advanced | 2 | female |
| Archimage | knight / advanced | 2 | female |
| Jeune Viking | north / recruit | 1 | female |
| Écuyer | knight / recruit | 1 | female |
| Squelette épéiste | enemy / enemy | 1 | — |
| Völva | north / advanced | 2 | female |
| Hamrammr | north / advanced | 2 | — |
| Squelette hacheur | enemy / enemy | 1 | — |
| Squelette lancier | enemy / enemy | 1 | — |
| Archer décharné | enemy / enemy | 1 | — |
| Arbalétrier décharné | enemy / enemy | 1 | — |
| Garde en armure | enemy / enemy | 1 | — |
| Cavalier spectral | enemy / enemy | 1 | — |
| Nécromancien ennemi | enemy / enemy | 1 | — |

## Animations par profil

| Skin | Poses présentes ou réutilisées | Provisoires | Manquantes |
| --- | --- | --- | --- |
| raider:male:axe-shield:default | idle (2), move (4), attack (8), counter (8), block (4), attack_again (6) | damage, death | critical, evade |
| hunter:female:bow:default | move (4), attack (7), counter (7), damage (2), death (2), evade (2), attack_again (7) | idle | critical |
| man_at_arms:female:sword-shield:default | move (4), attack (5), counter (5), damage (3), death (3), block (5), attack_again (5) | idle | critical, evade |
| crossbowman:male:crossbow:default | move (4), attack (7), counter (7), damage (2), death (2), evade (2), reload (4), attack_again (7) | idle | critical |
| skeleton:any:rusty-sword:default | move (4), attack (8), counter (8), damage (3), death (3), evade (3), attack_again (8) | idle | critical |
| raider:female:axe-shield:default | move (4), attack (5), counter (5), damage (3), death (3), block (5), attack_again (5) | idle | critical, evade |
| man_at_arms:male:sword-shield:default | idle (2), move (4), attack (8), counter (8), block (4), attack_again (6) | damage, death | critical, evade |
| cavalry:any:sword-shield:default | move (3), attack (5), counter (5), damage (3), death (3), evade (3), attack_again (5) | idle, block | critical |
| mounted_spearman:any:lance:default | move (3), attack (5), counter (5), damage (3), death (3), evade (3), charge (5), attack_again (5) | idle | critical |
| sans_rider:any:lance:default | move (3), attack (5), counter (5), damage (3), death (3), evade (3), attack_again (5) | idle | critical |
| standard_bearer:male:banner:carried | move (4), attack (8), counter (8), damage (3), death (3), evade (3), attack_again (8) | idle | critical, banner |
| standard_bearer:male:sword:planted | move (4), attack (8), counter (8), damage (3), death (3), evade (3), attack_again (8) | idle | critical |
| pavise_crossbowman:male:crossbow:default | move (4), attack (5), counter (5), damage (3), death (3), evade (3), reload (4), attack_again (5) | idle | critical, fortify |
| pavise_crossbowman:male:crossbow:fortified | attack (7), counter (7), damage (2), death (2), evade (2), reload (2), move (4), attack_again (7) | idle | critical |
| ironbreaker:male:great-axe:default | move (4), attack (8), counter (8), damage (2), death (2), evade (2), attack_again (8) | idle | critical |
| executioner:any:great-sword:default | move (4), attack (8), counter (8), damage (2), death (2), evade (2), attack_again (8) | idle | critical |
| berserker:male:dual-axes:default | move (4), attack (5), counter (5), damage (2), death (2), evade (2), attack_offhand (5), attack_again (5) | idle | critical |
| drengr:male:dual-swords:default | move (4), attack (5), counter (5), damage (2), death (2), evade (2), attack_offhand (5), attack_again (5) | idle | critical |
| north_warrior:male:axe:default | move (4), attack (7), counter (7), damage (2), death (2), evade (2), attack_again (7) | idle | critical |
| nordic_blade:male:sword:default | move (4), attack (8), counter (8), damage (2), death (2), evade (2), attack_again (8) | idle | critical |
| spearman:any:lance:default | move (4), attack (7), counter (7), damage (2), death (2), evade (2), attack_again (7) | idle | critical |
| swordsman:any:sword:default | move (4), attack (8), counter (8), damage (2), death (2), evade (2), attack_again (8) | idle | critical |
| shaman:male:healing:default | move (4), damage (3), death (3), evade (3), heal (5) | idle | — |
| sorcerer:male:spell:default | move (4), attack (5), counter (5), damage (3), death (3), evade (3), heal (5), attack_again (5) | idle | critical |
| raider:male:sword-shield:default | move (4), attack (8), counter (8), damage (3), death (3), block (5), attack_again (8) | idle | critical, evade |
| sans_axe:any:axe:default | move (4), attack (5), counter (5), damage (3), death (3), evade (3), attack_again (5) | idle | critical |
| sans_spear:any:lance:default | move (4), attack (5), counter (5), damage (3), death (3), evade (3), attack_again (5) | idle | critical |
| sans_archer:any:bow:default | move (4), attack (7), counter (7), damage (2), death (2), evade (2), attack_again (7) | idle | critical |
| sans_crossbow:any:crossbow:default | move (4), attack (7), counter (7), damage (2), death (2), evade (2), reload (4), attack_again (7) | idle | critical |
| sans_guard:any:sword-shield:default | move (4), attack (7), counter (7), damage (2), death (2), evade (2), block (4), attack_again (7) | idle | critical |
| sans_necromancer:any:spell:default | move (4), attack (7), counter (7), damage (2), death (2), evade (2), summon (4), attack_again (7) | idle | critical |
| necromancer:male:spell:default | move (4), attack (7), counter (7), damage (2), death (2), evade (2), heal (4), summon (4), attack_again (7) | idle | critical |
| archmage:male:spell:default | move (4), attack (7), counter (7), damage (2), death (2), evade (2), heal (4), area (4), attack_again (7) | idle | critical |
| huscarl:male:axe-shield:default | move (4), attack (5), counter (5), damage (3), death (3), block (5), intercept (5), attack_again (5) | idle | critical, evade |
| clan_healer:male:axe-shield:default | move (4), attack (5), counter (5), damage (3), death (3), block (5), attack_again (5) | idle | critical, evade, heal |
| honor_guard:any:sword-shield:default | move (4), attack (8), counter (8), damage (3), death (3), block (5), attack_again (8) | idle | critical, evade |
| master_hunter:female:bow:default | move (4), attack (5), counter (5), damage (3), death (3), evade (3), attack_again (5) | idle | critical |
| tracker:male:bow:default | move (4), attack (5), counter (5), damage (3), death (3), evade (3), attack_again (5) | idle | critical |
| ranger:male:crossbow:default | move (4), attack (5), counter (5), damage (3), death (3), evade (3), reload (4), attack_again (5) | idle | critical |
| guard_knight:any:sword-shield:default | move (4), attack (8), counter (8), damage (2), death (2), evade (2), attack_again (8) | idle, block | critical |
| royal_guard:any:lance-shield:default | move (4), attack (5), counter (5), damage (3), death (3), block (5), attack_again (5) | idle | critical, evade |
| duelist:male:dual-swords:default | move (4), attack (6), counter (6), damage (2), death (2), evade (2), attack_offhand (5), attack_again (6) | idle | critical |
| young_viking:male:training-axe:default | move (4), attack (5), counter (5), damage (3), death (3), evade (3), attack_again (5) | idle | critical |
| squire:male:training-sword:default | move (4), attack (8), counter (8), damage (3), death (3), evade (3), attack_again (8) | idle | critical |
| clan_healer:male:sword-shield:default | move (4), attack (5), counter (5), damage (3), death (3), block (5), attack_again (5) | idle | critical, evade, heal |
| tracker:male:axe:default | idle (2), move (4), counter (2), damage (2), death (2), attack_again (2) | attack | critical, evade |
| ranger:male:sword:default | move (4), attack (8), counter (8), damage (2), death (2), attack_again (8) | idle | critical, evade |
| huscarl:male:sword-shield:default | move (4), attack (5), counter (5), damage (3), death (3), block (5), intercept (5), attack_again (5) | idle | critical, evade |
| sorcerer:male:healing:default | move (4), damage (3), death (3), evade (3), heal (5) | idle | — |
| necromancer:male:healing:default | idle (2), move (4), damage (2), death (2), heal (4), summon (4) | — | evade |
| archmage:male:healing:default | idle (2), move (4), damage (2), death (2), heal (4), area (4) | — | evade |
| volva:male:spell:default | idle (2), move (4), attack (5), counter (5), damage (2), death (2), evade (2), heal (5), buff (5), attack_again (5) | — | critical |
| volva:male:healing:default | idle (2), move (4), damage (2), death (2), evade (2), heal (5), buff (5) | — | — |
| hamrammr:male:healing:default | idle (2), move (4), damage (2), death (2), evade (2), heal (5), transform (6) | — | — |
| hamrammr:any:claws:bear | move (4), attack (6), counter (6), damage (3), death (3), evade (3), transform (6), attack_again (6) | idle | critical |
