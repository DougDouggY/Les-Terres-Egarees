# Bilan de production visuelle

Cette phase ne modifie ni ne teste le gameplay. Les nouveaux Sans-Repos sont des définitions visuelles sans statistiques ni déploiement.

Une référence de sprite existe pour 39 entrées : 10 classes de base, 19 promotions définies, 2 recrues et 8 Sans-Repos. Les deux promotions du Chaman restent non définies.

## Statuts réels

- Fonctionnelle : au moins deux poses distinctes, réellement lues ; séquences courtes, sans promesse d’animation définitive fluide.
- Provisoire : pose unique, ressource historique, recyclage ou cycle identifié comme imparfait.
- Manquante : aucune séquence adaptée enregistrée.

Les comptes ci-dessous portent sur les animations attendues de chaque profil (sexe, équipement, état), pas sur des personnages ou des combats. La riposte peut réutiliser explicitement l’attaque.

| Classe | Profils | Fonctionnelles | Provisoires | Manquantes | Variantes de sexe non produites |
| --- | ---: | ---: | ---: | ---: | --- |
| Guerrier du Nord | 1 | 6 | 0 | 1 | Femme |
| Berserker | 1 | 6 | 0 | 1 | Femme |
| Brise-fer | 1 | 5 | 1 | 1 | Femme |
| Pillard | 3 | 10 | 10 | 4 | Aucune (référence dédiée ou neutre) |
| Huscarl | 2 | 12 | 4 | 2 | Femme |
| Guérisseur du clan | 2 | 14 | 0 | 4 | Femme |
| Lame nordique | 1 | 6 | 0 | 1 | Femme |
| Drengr | 1 | 6 | 0 | 1 | Femme |
| Garde d’honneur | 1 | 6 | 1 | 1 | Aucune (référence dédiée ou neutre) |
| Chasseur | 1 | 6 | 1 | 0 | Homme |
| Grand chasseur | 1 | 6 | 0 | 1 | Homme |
| Traqueur | 2 | 12 | 0 | 2 | Femme |
| Chaman | 1 | 5 | 0 | 1 | Femme |
| Homme d’armes | 2 | 4 | 10 | 2 | Aucune (référence dédiée ou neutre) |
| Chevalier de la garde | 1 | 6 | 1 | 1 | Aucune (référence dédiée ou neutre) |
| Cavalier | 1 | 6 | 1 | 2 | Aucune (référence dédiée ou neutre) |
| Lancier | 1 | 6 | 0 | 1 | Aucune (référence dédiée ou neutre) |
| Garde royal | 1 | 6 | 1 | 1 | Aucune (référence dédiée ou neutre) |
| Lancier monté | 1 | 6 | 1 | 1 | Aucune (référence dédiée ou neutre) |
| Porte-étendard | 2 | 11 | 0 | 4 | Femme |
| Arbalétrier | 1 | 6 | 1 | 1 | Femme |
| Rôdeur | 2 | 12 | 0 | 3 | Femme |
| Arbalétrier à pavois | 2 | 11 | 0 | 5 | Femme |
| Épéiste | 1 | 6 | 0 | 1 | Aucune (référence dédiée ou neutre) |
| Duelliste | 1 | 6 | 0 | 1 | Femme |
| Exécuteur | 1 | 5 | 1 | 1 | Aucune (référence dédiée ou neutre) |
| Sorcier | 2 | 12 | 0 | 2 | Femme |
| Nécromancien | 2 | 14 | 0 | 2 | Femme |
| Archimage | 2 | 14 | 0 | 2 | Femme |
| Jeune Viking | 1 | 6 | 0 | 1 | Femme |
| Écuyer | 1 | 5 | 1 | 1 | Femme |
| Squelette épéiste | 1 | 6 | 1 | 0 | Référence non sexuée |
| Squelette hacheur | 1 | 6 | 0 | 1 | Référence non sexuée |
| Squelette lancier | 1 | 6 | 0 | 1 | Référence non sexuée |
| Archer décharné | 1 | 6 | 0 | 1 | Référence non sexuée |
| Arbalétrier décharné | 1 | 6 | 0 | 2 | Référence non sexuée |
| Garde en armure | 1 | 6 | 0 | 2 | Référence non sexuée |
| Cavalier spectral | 1 | 6 | 0 | 1 | Référence non sexuée |
| Nécromancien ennemi | 1 | 7 | 0 | 1 | Référence non sexuée |

## Points restant à retravailler

- Brise-fer et Exécuteur : marche lourde provisoire.
- Cavaliers : transition de charge spécifique à compléter.
- Gardes et Huscarl : poses défensives présentes, véritable levée de bouclier et transition d’interception provisoires.
- Écuyer : pose finale agenouillée ; chute au sol à compléter.
- Jeune Viking : tenue avec petit bouclier d’entraînement à valider visuellement ; aucun équipement de partie modifié.
- Porte-étendard avant plantation et pavois normal : dégâts/mort absents, afin de ne pas emprunter un autre état d’équipement.
- Rechargements ordinaires et nombreuses esquives : absents, indiqués dans la galerie.
- Les deux premiers échantillons conservent leurs poses de combat statiques, marquées provisoires.
- Les variantes de sexe non produites restent vides ; une armure neutre réutilisée est explicitement notée non sexuée.

## Vérification et consultation

Galerie → Bilan des sprites et animations (JSON) exporte le catalogue courant. Les commentaires « À corriger » restent locaux au navigateur. Le fichier JSON voisin donne chaque animation, son statut et la note associée.

Couleurs : ennemis rose vif par défaut ; choix joueurs sans rose et distincts. La galerie peut tester toutes les couleurs librement, indépendamment des préférences de partie.

Contrôles utilisés : `npm run test:visual`, `npm run test:visual-ui`, compilation TypeScript/Vite. Aucune simulation, aucun lancement du premier combat.
