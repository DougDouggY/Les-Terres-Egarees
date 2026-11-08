# V17 — Fenêtre Personnage et inventaire

Le menu d'action propose un seul bouton **Personnage**. Il ouvre une fenêtre flottante compacte (650 px de large au maximum), avec une croix discrète dans le coin supérieur droit. La carte reste visible. Les anciens points d'entrée de fiche et d'équipement utilisent le même composant.

À gauche : cadre de portrait volontairement vide, nom, classe, niveau, expérience numérique des personnages jouables et PV numériques. Aucun portrait, initiale, barre de PV ou barre d'XP. Le profil reste dans le même élément du document lors du changement d'onglet.

À droite : inventaire en premier, avec flèches précédent/suivant pour passer aux statistiques. La sélection d'un objet affiche ses données réelles en bas : puissance de l'arme, modificateur de précision, pénalité d'agilité, parade si un bouclier est associé et propriétés particulières disponibles. Les armes peuvent être prises en main pendant l'activation autorisée, conformément aux règles existantes. La magie de soins des classes hybrides ne redevient pas un mode d'équipement obligatoire.

Les statistiques utilisent des barres segmentées avec la valeur numérique superposée : force/puissance, défense, agilité effective, initiative effective, précision, mouvement effectif, vision et parade lorsqu'elle existe. Les graduations visuelles sont lisibles aux niveaux habituels, indépendamment des plafonds techniques du moteur. Les valeurs du jeu ne sont pas modifiées.

Infobulles sur le nom (courte biographie), la classe (rôle sans annoncer les évolutions) et les caractéristiques (explication brève). Les noms personnalisés sont échappés et restent utilisables. Aucune portée ni mention « équipé » affichée dans la fenêtre. Un marqueur discret indique l'arme tenue.

Les anciens consommables sont désormais des **bandages**, restaurant jusqu'à 15 PV, avec leur quantité conservée. Le champ sérialisé historique `potions` reste utilisé pour préserver les sauvegardes ; il n'est plus présenté sous ce nom aux joueurs. Les textes du camp sont également adaptés. Les bandages consommables ne modifient pas les capacités de soin des classes.

## Vérifications

- Tests moteur et rendu HTML : ouverture inventaire, portrait vide, valeurs numériques, absence d'XP ennemie, absence de portée, statistiques et infobulles sans annonces d'évolution, bandages à 15 PV, quantité et sauvegarde conservées, noms personnalisés sûrs.
- Chromium : dimensions compactes, profil inchangé entre les pages, sélection et prise en main d'une arme puis sauvegarde après activation, infobulle de nom, fermeture par croix, consommation réelle des bandages, inspection ennemie en lecture seule et petite résolution.
- Régression du zoom à la roulette et de l'ouverture de fiche.
- Suite automatique, compilations publique et prototype et contrôles de séparation des outils de développement.

Aucune carte, position, ressource de sprite ou cinématique modifiée. Aucun portrait ni nouvelle illustration généré. Les sauvegardes actuelles restent compatibles.
