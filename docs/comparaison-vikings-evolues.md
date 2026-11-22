# Comparaison des Vikings évolués

Page publiée : `validation/vikings-evolues/index.html`. Elle est aussi accessible depuis « Essai des animations » → « Comparer les Vikings évolués ».

Dix classes actuelles : Berserker, Brise-fer, Huscarl, Guérisseur du clan, Drengr, Garde d’honneur, Grand chasseur, Traqueur, Völva et Hamrammr. La page couvre trente variantes : hommes et femmes, chaque équipement de départ et les formes humaine/ours du Hamrammr. Trois Vikings de base déjà validés servent de références supplémentaires.

Les captures proviennent des mêmes profils de carte et de combat que le jeu. Les humains utilisent l’échelle corporelle de combat habituelle ; l’ours conserve sa proportion relative. Les poses sont centrées sans déformer les images et sans changer de personnage. Les soigneurs présentent leur geste de soin. Les apparences partagées et les limites connues des profils sont indiquées, sans créer de sprite manquant.

La page comprend des filtres par classe et par sexe et un agrandissement tactile. Les images sont des fichiers PNG séparés, chargés au fil du défilement. Aucune règle, classe, sauvegarde ou ressource d’unité n’a été modifiée.

Régénération : démarrer Vite sur le port 5173, puis exécuter `node scripts/compare-viking-advanced.mjs`. Le manifeste enregistre les ressources sources utilisées.

Vérification : les deux parcours navigateur (390 et 1280 pixels) passent, sans débordement horizontal ; filtres, agrandissement et disponibilité des captures vérifiés. Les 225 tests existants, la compilation et le contrôle du prototype passent. Les images ont été vérifiées pour éviter les silhouettes coupées aux bords.
