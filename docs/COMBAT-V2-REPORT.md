# Combat V2 — inventaire et bilan de la refonte

Toutes les classes et promotions ont été parcourues ; 55 profils existants sont intégrés au nouveau lecteur. Cette intégration technique ne signifie pas que tous les dessins manquants ont été produits ou que toutes les animations sont artistiquement terminées. Les lacunes sont explicites ci-dessous et dans le JSON.

## Référence réellement examinée

Comparateur, battle-scene.js, adaptateur portable, treize scénarios, manifeste des ancrages et inventaire des poses ont été lus et exécutés. Les extraits de référence sont archivés dans `reference-combat-v2/`. Les costumes de l’ancien jeu ne remplacent aucun personnage du projet.

Le lecteur adapte les phases à 58 % de contact, le maintien au contact 620/500 ms des deux armes, le remappage du second impact à 160 ms et la parade avec riposte autorisée sur 1 550 ms. Le dépassement spatial possible après le contact dans la formule de référence est borné à 1. Les événements tactiques sont fournis une fois ; aucune résolution supplémentaire dans le dessin.

## Architecture et protections

- Classe : règles, statistiques, capacités et équipements inchangés. Skin de combat : identité stable par classe/sexe/équipement/état ; les atlas V2 sont indépendants des sprites tactiques. Animation : poses, ancres, échelle fixe par source d’un skin, phases et événements.
- Aucune substitution silencieuse par une classe précédente. Une pose absente garde le skin courant et est signalée dans les diagnostics, au lieu de charger un autre personnage.
- Ancres des pieds et points d’armes séparés des rectangles transparents. Extraction des figures V2 par composantes alpha et centroïde des pieds ; masques de lecture des composantes pour exclure les fragments voisins sans modifier les images sources.
- Cavaliers : hauteur de référence 272 contre 136 à pied ; cadrage agrandi. Ours : proportions et ressource conservées.
- Carte, décors, dimensions, statistiques, classes, promotions, moteur de calcul, conditions de victoire et brouillard conservés. La sauvegarde accepte deux champs optionnels de présentation ; aucune nouvelle version obligatoire.

## Ressources créées

Huit atlas transparents, 200 poses dessinées, 26 profils ou états remplacés. Le détail des sources, dimensions, empreintes et transparences est dans `COMBAT-V2-ART.json`.

Les images `combat-v2-*.png` sont de nouveaux atlas de combat. Les propositions initiales contenant une arme erronée ont été corrigées avant intégration ; les fichiers de génération intermédiaires ne sont pas utilisés. Les anciens PNG et les sprites tactiques restent intacts.

## Classes, promotions et variantes

| Classe | Type | Skins intégrés | Variantes non dessinées |
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

## Animations par skin

Les alias sont explicités. Une riposte peut réutiliser l’attaque du même skin et de la même arme ; une seconde main ne reçoit jamais une parade ou une attaque principale en remplacement.

| Skin | Atlas neuf | Animations présentes | Manquantes | Provisoires / réutilisées |
| --- | --- | --- | --- | --- |
| raider:male:axe-shield:default | Non | idle, attack, block, attack_again | critical, evade | move (provisional), counter (reused), damage (provisional), death (provisional) |
| hunter:female:bow:default | Non | attack, damage, death, evade | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| man_at_arms:female:sword-shield:default | Oui | attack, damage, death, block | critical, evade | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| crossbowman:male:crossbow:default | Non | attack, damage, death, evade, reload | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| skeleton:any:rusty-sword:default | Oui | attack, damage, death, evade | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| raider:female:axe-shield:default | Oui | attack, damage, death, block | critical, evade | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| man_at_arms:male:sword-shield:default | Non | idle, attack, block, attack_again | critical, evade | move (provisional), counter (reused), damage (provisional), death (provisional) |
| cavalry:any:sword-shield:default | Oui | move, attack, damage, death, evade | critical | idle (provisional), counter (reused), block (provisional), attack_again (reused) |
| mounted_spearman:any:lance:default | Oui | move, attack, damage, death, evade, charge | critical | idle (provisional), counter (reused), attack_again (reused) |
| sans_rider:any:lance:default | Oui | move, attack, damage, death, evade | critical | idle (provisional), counter (reused), attack_again (reused) |
| standard_bearer:male:banner:carried | Oui | attack, damage, death, evade | critical, banner | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| standard_bearer:male:sword:planted | Oui | attack, damage, death, evade | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| pavise_crossbowman:male:crossbow:default | Oui | attack, damage, death, evade | critical, fortify | idle (provisional), move (provisional), counter (reused), reload (provisional), attack_again (reused) |
| pavise_crossbowman:male:crossbow:fortified | Non | attack, damage, death, evade, reload | critical | idle (provisional), counter (reused), move (provisional), attack_again (reused) |
| ironbreaker:male:great-axe:default | Non | attack, damage, death, evade | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| executioner:any:great-sword:default | Non | attack, damage, death, evade | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| berserker:male:dual-axes:default | Non | attack, damage, death, evade, attack_offhand | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| drengr:male:dual-swords:default | Non | attack, damage, death, evade, attack_offhand | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| north_warrior:male:axe:default | Non | attack, damage, death, evade | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| nordic_blade:male:sword:default | Non | attack, damage, death, evade | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| spearman:any:lance:default | Non | attack, damage, death, evade | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| swordsman:any:sword:default | Non | attack, damage, death, evade | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| shaman:male:healing:default | Oui | damage, death, evade, heal | — | idle (provisional), move (provisional) |
| sorcerer:male:spell:default | Oui | attack, damage, death, evade, heal | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| raider:male:sword-shield:default | Oui | attack, damage, death, block | critical, evade | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| sans_axe:any:axe:default | Oui | attack, damage, death, evade | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| sans_spear:any:lance:default | Oui | attack, damage, death, evade | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| sans_archer:any:bow:default | Non | attack, damage, death, evade | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| sans_crossbow:any:crossbow:default | Non | attack, damage, death, evade, reload | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| sans_guard:any:sword-shield:default | Non | attack, damage, death, evade, block | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| sans_necromancer:any:spell:default | Non | attack, damage, death, evade, summon | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| necromancer:male:spell:default | Non | attack, damage, death, evade, heal, summon | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| archmage:male:spell:default | Non | attack, damage, death, evade, heal, area | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| huscarl:male:axe-shield:default | Oui | attack, damage, death, block, intercept | critical, evade | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| clan_healer:male:axe-shield:default | Oui | attack, damage, death, block | critical, evade, heal | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| honor_guard:any:sword-shield:default | Oui | attack, damage, death, block | critical, evade | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| master_hunter:female:bow:default | Oui | attack, damage, death, evade | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| tracker:male:bow:default | Oui | attack, damage, death, evade | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| ranger:male:crossbow:default | Oui | attack, damage, death, evade | critical | idle (provisional), move (provisional), counter (reused), reload (provisional), attack_again (reused) |
| guard_knight:any:sword-shield:default | Non | damage, death, evade | critical | idle (provisional), move (provisional), attack (provisional), counter (provisional), block (provisional), attack_again (provisional) |
| royal_guard:any:lance-shield:default | Oui | attack, damage, death, block | critical, evade | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| duelist:male:dual-swords:default | Non | attack, damage, death, evade, attack_offhand | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| young_viking:male:training-axe:default | Oui | attack, damage, death, evade | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| squire:male:training-sword:default | Oui | attack, damage, death, evade | critical | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| clan_healer:male:sword-shield:default | Oui | attack, damage, death, block | critical, evade, heal | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| tracker:male:axe:default | Non | idle, move, damage, death | critical, evade | attack (provisional), counter (reused), attack_again (reused) |
| ranger:male:sword:default | Non | idle, move, damage, death | critical, evade | attack (provisional), counter (reused), attack_again (reused) |
| huscarl:male:sword-shield:default | Oui | attack, damage, death, block, intercept | critical, evade | idle (provisional), move (provisional), counter (reused), attack_again (reused) |
| sorcerer:male:healing:default | Oui | damage, death, evade, heal | — | idle (provisional), move (provisional) |
| necromancer:male:healing:default | Non | idle, move, damage, death, heal, summon | evade | — |
| archmage:male:healing:default | Non | idle, move, damage, death, heal, area | evade | — |
| volva:male:spell:default | Non | idle, move, attack, damage, death, evade, heal, buff | critical | counter (reused), attack_again (reused) |
| volva:male:healing:default | Non | idle, move, damage, death, evade, heal, buff | — | — |
| hamrammr:male:healing:default | Non | idle, move, damage, death, evade, heal, transform | — | — |
| hamrammr:any:claws:bear | Non | idle, move, attack, damage, death, evade, transform | critical | counter (reused), attack_again (reused) |

## Réserves graphiques à ne pas masquer

- Les critiques dédiés, plusieurs esquives et des marches de combat spécifiques restent absents. La présence d’un mouvement spatial ne remplace pas un nouveau dessin de marche.
- Porte-étendard porté/planté et pavois non fortifié : réactions et chutes ajoutées dans les nouveaux atlas. Certaines autres séquences courtes à deux poses restent signalées provisoires.
- Les animations de soin, transformation, invocation, bannière et rechargement conservées doivent être inspectées dans le comparateur : certaines sont courtes ou provisoires. Aucun nouveau sort ou capacité n’est ajouté au moteur.
- Les variantes de sexe absentes restent absentes ; les armures neutres sont signalées comme telles.
- Les sources dont des figures se touchent restent signalées par l’audit. Les masques excluent les composantes étrangères isolées ; ils ne redessinent pas des membres soudés dans le raster.

## Vérifications et accès

Menu principal → Tests de combat → Comparer toutes les animations. Classe, arme, skin, scénario, capacités, lecture, pause, ×0,5 / ×0,2, miroir, curseur, ancres et export JSON. Galerie : choix séparé « Sprites tactiques » / « Skins de combat V2 ». Arène : déplacement animé sur un chemin valide avec le coût et les collisions du moteur.

Les planches successives sont dans `artifacts/combat-v2/skins-*.png` et le relevé des poses effectivement rendues dans `artifacts/combat-v2/render-audit.json`. L’examen visuel a porté sur les 55 profils, pas uniquement le premier duel. Les tests de lecture et d’intégrité ne constituent pas une certification artistique de toutes les poses.

## Interface

Barre d’initiative au bord supérieur, bouton œil rétractable conservé dans la sauvegarde ; acteur toujours recentré à la réouverture. Cadres d’objectif et d’information cohérents, verts médiévaux translucides. Actions près du personnage sans son nom, disparition pendant la sélection d’une attaque et retour par clic droit. Prévision compacte avec valeurs comparables, critique et ×2 sous les dégâts, couleurs d’équipe, sans barre de vie, sans voile noir. Portées vertes de soin conformes au moteur ; priorité offensive et déplacement bleu retiré après confirmation.

## Résultats de vérification

- `npm test` : réussi (tests visuels de ressources et systèmes indépendants).
- Interface : 29 tests réussis dans le parcours complet ; un test lisait un attribut avant le premier rendu. Après ajout de cette attente, les deux tests V2 ont réussi. Les 30 cas sont donc couverts, sans modification du code produit pour masquer une erreur.
- Constructions publique et prototype : réussies ; séparation des outils de développement vérifiée dans les deux versions.
- Audit de rendu : 55 profils, 451 animations enregistrées (alias compris), 1 548 images de poses rendues ; aucune pose disponible non dessinée, aucun dépassement du cadre dans les échantillons de séquences. Ce nombre inclut les ressources existantes, pas uniquement les nouveaux dessins.
- Revue visuelle : planches des skins, capacités, contacts montés, doubles armes et interface ; corrections des costumes, armes erronées et fragments isolés. Les limites ci-dessus restent ouvertes : notamment les transitions courtes Traqueur/hache et Rôdeur/épée, la parade montée provisoire et les soins dédiés du Guérisseur du clan.
- Aucun changement des données de carte, des décors ou du moteur de résolution. Les tests utilisent des scènes de développement et des sauvegardes de test isolées.
