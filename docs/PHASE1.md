# Phase 1 — classes, interface et galerie

**Production visuelle mise à jour :** les lots 1 à 4 couvrent désormais 39 entrées et 51 profils. Voir [le bilan courant](SPRITES-PRODUCTION-REPORT.md) pour les états réels et les manques. Les ennemis ont maintenant le rose vif par défaut ; les joueurs le testent uniquement en galerie. Les contrôles de cette phase ne lancent aucun gameplay.

**Mise à jour du prototype :** les deux outils sont maintenant accessibles en ligne pour les tests, et un échantillon recolorable de deux classes est intégré. Voir [SPRITE-COLORS.md](SPRITE-COLORS.md) pour les couleurs, les limites actuelles et l’exclusion des outils de la version finale.

La carte tactique validée est conservée : terrain, décors, dimensions, raccords, caméra et brouillard. Les empreintes de ses cinq fichiers sources et graphiques sont enregistrées dans `baselines/validated-map.json` et vérifiées par les tests. Aucun tileset n’a été régénéré. Les sprites d’essai ajoutés ultérieurement sont décrits dans le document des couleurs.

La boucle actuelle passe de la création des deux héros au combat existant, puis à un bilan sauvegardable. L’ancien camp permanent est retiré des menus et de la boucle. Ses ressources, données et code sont conservés pour une utilisation ultérieure ; les anciennes sauvegardes de camp ouvrent le bilan sans perdre leur contenu. Aucun campement temporaire, chapitre ou personnage définitif nouveau n’est ajouté.

## Données configurables

- `src/data/classes.ts` : dix classes de base, dix-neuf promotions définies, deux recrues et le squelette existant. Statistiques, capacités, arbres, niveaux et réglages de test. Le Chaman conserve deux voies à définir, sans nom ni capacité inventés.
- `src/data/weapons.ts` : armes, portées, précision, nombre de frappes, efficacités et équipement graphique.
- `src/game/classes.ts` : progression, promotions, compatibilité et découverte. Les recrues exigent exactement deux choix de base dans leurs données individuelles.
- `src/game/skills.ts` : soins, bannière irréversible, fortification personnelle, invocation temporaire. Le moteur de combat gère triangles, double arme, parade, interception et zone.

La portée de riposte utilise uniquement l’arme active. L’interface Objet / Équipement permet de changer cette arme pendant l’activation. La sélection et le clic direct sur une destination restent le moyen de déplacement ; le menu contextuel laisse les cases adjacentes libres. Les informations des classes et capacités inconnues restent cachées dans l’aide normale.

## Outils privés de développement

```sh
npm ci
npm run dev
```

Le menu principal de ce serveur de développement propose **Classes et systèmes** et **Galerie des sprites**. Ces interfaces sont supprimées à la compilation de production, y compris leur code et leurs styles. Le prototype GitHub Pages les active désormais explicitement avec le mode prototype ; la compilation finale standard les exclut toujours. `npm run check:public` vérifie cette exclusion après le build.

La galerie propose classes et promotions, variantes, états, animations, lecture, arrêt, reprise, image par image, zoom net et comparaison de quatre sélections. Les annotations sont conservées dans le navigateur par variante et animation, avec statut « À corriger », commentaire et export JSON. Elles ne sont pas partagées automatiquement entre appareils.

### Ajouter une ressource

Le jeu et la galerie partagent `src/sprites/resources.ts` et le même registre. Les personnages ne possèdent pas de planche individuelle.

Ajouter une description `*.sprite.json` dans `src/assets/tactical/`, en suivant `legacy.sprite.json`. Chaque profil indique `classId`, `gender`, `equipment`, `state` et ses clips avec `source`, `columns`, `rows`, `row`, `frames`, `fps`. Un clip peut explicitement réutiliser un autre clip du même profil. Des fichiers supplémentaires peuvent compléter les clips d’un profil existant, mais les doublons sont signalés. Les images déposées dans ce dossier sont référencées par `tactical/nom.png` (ou WebP) et découvertes automatiquement par Vite.

Les planches existantes fournissent actuellement quatre profils humains : Pillard homme, Chasseur femme, Homme d’armes femme et Arbalétrier homme ; le squelette existant est non sexué. L’échantillon recolorable ajoute depuis les deux sexes du Pillard et de l’Homme d’armes ; les autres combinaisons non fournies sont marquées manquantes. Une riposte qui réutilise l’attaque est annoncée explicitement. La galerie ne remplace jamais une ressource manquante par une autre classe, un autre sexe ou un visuel inventé. Sur le terrain, un simple repère d’unité permet de jouer une classe sans ressource, sans prétendre représenter son futur sprite.

## Décisions encore ouvertes

| Sujet                                                                                        | Disposition provisoire pour tester                                                                                                                         |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deux promotions du Chaman                                                                    | Non définies, aucune invention                                                                                                                             |
| Statistiques, progression, triangles, efficacités, parade, soins, charge, pavois et bannière | Valeurs de test centralisées, à équilibrer et valider                                                                                                      |
| Invocation                                                                                   | Squelette déjà présent, maximum deux ; expiration après trois activations de la créature, même si l’invocateur meurt ; suppression à la fin de la bataille |
| Attaque de zone                                                                              | Rayon une case, ennemis seulement, sans riposte ; réglages configurables                                                                                   |
| Recharge                                                                                     | Préparation gratuite pendant l’activation, sans annuler le pavois ; coût final à décider                                                                   |
| Sprites et portraits manquants                                                               | Emplacements identifiés ; aucune génération pour remplir les vides                                                                                         |

## Vérification

```sh
npm test
npm run test:e2e
npm run check:public
```

Les tests couvrent l’intégrité de la carte, les quatre combinaisons de factions jusqu’à la victoire, les portées et ripostes, les capacités, la migration des sauvegardes, le registre partagé, la galerie et l’absence des outils privés dans la version publique.
