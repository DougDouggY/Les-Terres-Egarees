# Sprites et couleurs d’équipe — prototype de test

Le prototype en ligne expose désormais **Galerie des sprites** et **Classes et systèmes** dans son menu principal. Cette exception est volontaire pendant les tests. La version finale peut exclure les deux outils sans changer le jeu : `npm run build` produit cette version ; `npm run build:prototype` active les outils avec `.env.prototype`. La publication GitHub Pages utilise actuellement le second mode.

## Échantillon intégré

Deux atlas partagés contiennent le Pillard et l’Homme d’armes, homme et femme : `src/assets/tactical/team-sample.png` pour les deux images de repos et les deux images de marche, et `team-sample-combat.png` pour les poses d’attaque, de dégâts et de mort. La riposte réutilise explicitement l’attaque. Ces quatre profils sont partagés par tous les personnages de ces classes, quels que soient leur identité et leur propriétaire. Ils remplacent uniquement les séquences correspondantes ; les anciennes ressources graphiques restent conservées. Les poses de combat retenues comportent une image chacune. La colonne d’anticipation aux marges insuffisantes n’est volontairement pas utilisée.

Les autres classes et les anciennes animations non remplacées sont conservées. Elles restent affichables ; quand leur masque de matière n’est pas préparé, la galerie l’indique clairement et n’applique pas de faux filtre global. Les animations absentes restent signalées comme manquantes. Cet échantillon sert à vérifier le système avant d’étendre les générations aux autres classes, promotions et monstres.

Une première étude de silhouettes avait été générée avant réception des nouvelles consignes de couleurs ; elle n’est pas livrée ni utilisée par le jeu. Aucune variante d’image par équipe ou couleur n’est produite.

## Recoloration

Les matériaux d’équipe sont identifiés par une palette magenta réservée aux tissus, capes et panneaux peints des boucliers. Le clip déclare `recolor: "magenta"`. `src/sprites/recolor.ts` remplace seulement ces pixels, conserve leurs ombres et leur transparence, et laisse les matériaux naturels intacts. Les résultats sont mis en cache par atlas et couleur, pas par personnage ; aucune régénération ni opération sur chaque image d’animation n’est nécessaire.

Les neuf couleurs sont bleu, rouge, jaune, vert, violet, orange, rose, anthracite et blanc. Chacune peut être attribuée à chaque joueur ou aux ennemis. Seule contrainte : les deux joueurs doivent avoir des couleurs distinctes. Les couleurs initiales provisoires sont bleu / jaune / rouge.

Les cercles colorés sous les unités ont été retirés. Les carrés de sélection et de tour actif restent des informations de commande, indépendantes de la couleur d’équipe. Les barres de vie utilisent une couleur de santé commune.

## Utilisation

- **Nouvelle partie → Couleurs des équipes** : définir J1, J2 et ennemis avant le déploiement.
- **Options → Couleurs des équipes**, ou menu de pause : modifier la partie en cours. Les choix sont enregistrés dans la sauvegarde et restaurés au chargement ; les anciennes sauvegardes reçoivent les valeurs par défaut.
- **Galerie → Couleur de l’aperçu** : changement immédiat sans nouvelle image.
- **Comparer J1 / J2 / ennemis** : afficher trois exemplaires identiques de la classe avec les préférences enregistrées.
- **Ajouter à la comparaison** : juxtaposer jusqu’à quatre sélections, y compris plusieurs couleurs d’une même classe.
- **Préférences des couleurs de test** : enregistrer les couleurs pour les prochaines parties. Une partie déjà créée conserve ses propres choix.
- Les filtres **Faction** et **Classe / promotion** simplifient la liste ; les signalements « À corriger » et l’export JSON sont conservés.

## Vérification des deux compilations

```sh
npm run build
npm run check:public
npm run build:prototype
npm run check:prototype
```

Pour comparer les deux variantes simultanément, conserver la version finale dans `dist` et compiler le prototype avec `--outDir dist-prototype`. Les tests navigateur font ces deux compilations avec la base GitHub Pages puis vérifient leurs accès séparément.

La carte validée, ses dimensions, ses terrains, ses décors, ses raccords et ses mécaniques restent inchangés. Le test d’intégrité SHA-256 de la phase 1 continue de les protéger.
