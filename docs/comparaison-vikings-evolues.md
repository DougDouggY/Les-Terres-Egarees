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

## Corrections des attaques et identification des classes

La comparaison propose désormais 26 variantes corrigées, avec 568 références de poses (552 figures distinctes, les Völva partageant leurs gestes de sort et de soin). Les Grands chasseurs et la forme ours restent les références précédentes. Les nouvelles silhouettes ne sont pas encore installées en campagne.

- Berserker et Drengr H/F : huit poses d’attaque dédiées, bras alternés, enchaînement des deux coups sans remise en garde intermédiaire et deux impacts visuels. Les ripostes et les doubles frappes d’agilité ne nécessitent toujours pas de planche supplémentaire.
- Brise-fer H/F : attaque lourde à deux mains, manche unique, préparation puis frappe et récupération. Une seule frappe visuelle.
- Huscarl : cotte de mailles, fourrure sombre, casque et bouclier renforcé d’argent. Garde d’honneur : larges garnitures dorées, cape et bouclier à chevrons. Le gabarit élancé est conservé.
- Guérisseurs : bandoulière et bandages de bras blancs, rouleaux et sacoche médicale. Traqueurs : haches dégagées et lisibles, également portées devant la hanche quand l’arc est actif.
- Völva et Hamrammr humain H/F : huit poses de bâton tendu vers la cible. Le sort part de son extrémité ; le soin conserve son effet propre et les éléments existants ne changent pas. Le petit effet de trajet depuis le bâton est partagé avec le rendu de foudre de campagne, sans changer les décisions de combat.

Les poses corrigées sont dans `reprises/corrections/`, avec provenance dans `docs/references/advanced-review-revisions.json`. Les poses d’attaque sont mesurées avec un point d’appui au pied arrière et une échelle constante fondée sur la récupération, pour éviter le recul involontaire et le rétrécissement à la levée des armes. La fenêtre propose une séquence « Double coup · enchaîné ». Les vues « Avant cette correction » conservent les silhouettes de la comparaison précédente lorsqu’elles existaient.

Reconstruction : `python scripts/register-advanced-review.py`, puis `node scripts/export-review-staff-effect.mjs` après une modification de l’effet partagé. Les PNG originaux ne sont pas réécrits. Le script de captures avant correction est volontairement limité au manifeste précédent afin de ne pas écraser les références.

Vérifications : 229 tests automatisés réussis ; quatre parcours du lecteur (390/1280 pixels, toutes les séquences, double impact et origine du bâton), ainsi que les deux parcours de comparaison précédents. Aucune écriture en sauvegarde pendant les essais. Compilation et contrôle du prototype réussis. La validation artistique finale reste à faire par le joueur.

## Validation des apparences uniquement

À la demande du joueur, la validation des animations est reportée : des défauts d’attaque restent signalés et les séquences ne sont pas considérées comme approuvées. La page le précise, présente d’abord la garde statique et conserve les commandes d’animation pour une reprise ultérieure.

La hache portée à la ceinture de la Traqueuse à l’arc est corrigée, avec un manche continu, une seule lame et sans main supplémentaire. Les quatre variantes de Guérisseur perdent leur cape ; la petite capuche et le col restent, la tunique devient visible. Leur équipement médical est réduit à une sacoche, un petit rouleau et un bandage discret. Les poses et le système de combat ne sont pas retravaillés dans cette étape. Les cinq vues avant correction sont conservées pour comparaison.

Contrôles de cette correction : 229 tests automatisés, quatre essais navigateur du lecteur et compilation/contrôle du prototype réussis. Vue agrandie de la Guérisseuse contrôlée à 390 pixels. Ces contrôles vérifient le chargement, les marges et le fonctionnement de la page ; ils ne valent pas validation artistique des attaques.
