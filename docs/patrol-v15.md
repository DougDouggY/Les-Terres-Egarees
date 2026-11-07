# V15 — Patrouille, survol allié et Écuyer

- Les approches et déploiements utilisent une horloge de présentation indépendante du temps mural. Une image lente ne fait avancer la séquence que de 50 ms au maximum ; trajet, poses, caméra, temporisation et validation avancent ensemble. La fin est validée lorsque l'animation est réellement arrivée au bout, pas pendant un blocage du navigateur. Les autres animations et règles de déplacement sont conservées.
- Toutes les poses demandées sont préchauffées, au lieu de la première pose uniquement, avant le début des cinématiques. Aucune nouvelle image créée.
- Survol d'une unité alliée visible, de l'une ou l'autre équipe : déplacement bleu, portée offensive rouge, soins verts, depuis ses destinations possibles. Calcul réutilisant les vrais chemins, capacités et portées ; aucune modification de l'unité ou de son équipement. Les informations restent limitées à la connaissance du joueur. Une action de ciblage explicite garde son affichage habituel.
- L'Écuyer dispose d'une référence de classe débutante : 15 PV, force 3, défense 2, agilité 5, initiative 4, précision 80. Variations individuelles normales pour Géraud, sans malus supplémentaire de soldat ordinaire. Épée légère, déplacement 4, vision 6 et taux de croissance historiques conservés. Le profil s'applique aux nouvelles créations : les statistiques enregistrées ne sont pas réécrites. Relancer un test neuf pour observer Géraud avec ces nouvelles valeurs.

Vérifications : tests de non-mutation, portée des deux équipes, magie et soins, visibilité, profil d'Écuyer ; contrôle Chromium d'un blocage de rendu simulé de 3 secondes sans téléportation puis fin complète du déploiement ; survol allié dans le navigateur ; régressions approche et retour au combat. Compilations publique et prototype et contrôles d'absence/présence des outils de développement.

Carte, décors, dialogues, placements et sauvegardes conservés.
