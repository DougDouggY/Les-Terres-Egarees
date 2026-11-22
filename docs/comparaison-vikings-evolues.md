# Comparaison des Vikings évolués

Page publiée : `validation/vikings-evolues/index.html`. Elle est aussi accessible depuis « Essai des animations » → « Comparer les Vikings évolués ».

Dix classes actuelles : Berserker, Brise-fer, Huscarl, Guérisseur du clan, Drengr, Garde d’honneur, Grand chasseur, Traqueur, Völva et Hamrammr. La page couvre trente variantes : hommes et femmes, chaque équipement de départ et les formes humaine/ours du Hamrammr. Trois Vikings de base déjà validés servent de références supplémentaires.

Les captures proviennent des mêmes profils de carte et de combat que le jeu. Les humains utilisent l’échelle corporelle de combat habituelle ; l’ours conserve sa proportion relative. Les poses sont centrées sans déformer les images et sans changer de personnage. Les soigneurs présentent leur geste de soin. Les apparences partagées et les limites connues des profils sont indiquées, sans créer de sprite manquant.

La page comprend des filtres par classe et par sexe et un agrandissement tactile. Les images sont des fichiers PNG séparés, chargés au fil du défilement. Aucune règle, classe, sauvegarde ou ressource d’unité n’a été modifiée.

Régénération : démarrer Vite sur le port 5173, puis exécuter `node scripts/compare-viking-advanced.mjs`. Le manifeste enregistre les ressources sources utilisées.

Vérification : les deux parcours navigateur (390 et 1280 pixels) passent, sans débordement horizontal ; filtres, agrandissement et disponibilité des captures vérifiés. Les 225 tests existants, la compilation et le contrôle du prototype passent. Les images ont été vérifiées pour éviter les silhouettes coupées aux bords.

## Nouvelles silhouettes et animations à comparer

Quinze variantes ont maintenant une nouvelle planche : Berserker H/F, Brise-fer H/F, Huscarl hache/bouclier H/F et épée/bouclier H/F, Guérisseur du clan avec ces deux équipements H/F, Drengr masculin et Garde d’honneur H/F. Le Drengr féminin, les Grands chasseurs et les classes suivantes sont conservés comme références, selon le périmètre annoncé.

Les nouvelles planches représentent 376 poses : 24 par variante, 28 pour les quatre Guérisseurs avec leur action de bandage. Chaque nouvelle silhouette est réellement redessinée ; aucune ancienne image n’a été étirée. Les anciennes ressources de campagne ne sont ni remplacées ni supprimées pendant cette étape de comparaison.

La page montre l’ancienne et la nouvelle version côte à côte. Le lecteur permet d’examiner attente, approche, attaque, seconde arme lorsqu’elle existe, parade uniquement avec un bouclier, esquive, dégâts, mort et bandage pour les Guérisseurs. Pause, rejeu, vitesses ×0,25/×0,5/×1 et agrandissement tactile sont disponibles. Le critique conserve l’effet partagé ; les ripostes et secondes frappes réutilisent l’attaque.

Les fichiers PNG générés sont conservés tels quels dans `public/validation/vikings-evolues/reprises/`. Le découpage mesure les silhouettes et produit les masques de rendu, sans réécrire les images. `scripts/register-advanced-review.py` vérifie le nombre de figures, les marges et les indices avant de produire le manifeste. Les sources sont tracées dans `docs/references/advanced-review-sources.json` ; les copies publiées permettent aussi de régénérer les mesures.

Le lecteur limite son cache d’images et de silhouettes et ne fait jouer qu’une animation à la fois pour ménager les téléphones. Il n’écrit aucune sauvegarde et n’active aucun profil de combat dans la partie.

Vérifications de cette étape : 226 tests automatisés réussis ; trois parcours navigateur du lecteur réussis (ordinateur, téléphone, toutes les séquences des quinze variantes sans écriture en sauvegarde), et les deux parcours de comparaison précédents réussis. Compilation et contrôle du prototype réussis.
