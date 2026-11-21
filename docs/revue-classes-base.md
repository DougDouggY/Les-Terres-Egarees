# Revue des classes de base

Le périmètre confirmé est : terminer les Vikings de base avec la Guerrière du Nord, comparer les Chevaliers de base, puis décider des reprises avant de passer aux classes avancées. Aucune classe avancée ni illustration de Chevalier n’est modifiée.

## Guerrière du Nord

Nouvelle planche `combat-v4-north-refresh-north-warrior-female.png`, utilisée sur la carte et en combat avec le même identifiant de classe, de sexe, d’équipement et d’état. La hache possède une seule lame ; la tête initialement double dans la pose levée a été corrigée avant intégration. Le PNG possède un canal alpha transparent. Les contours, les pieds et la hauteur anatomique sont mesurés sur les silhouettes complètes.

23 poses : deux attentes tactiques, deux gardes, quatre pas rapides, huit poses d’attaque, trois esquives, trois réactions aux dégâts et une mort. Aucune parade, puisque cette unité ne porte pas de bouclier. La riposte et la seconde attaque réutilisent l’attaque, et le critique conserve son effet partagé. La calibration de couleur et le calcul de contact existants couvrent automatiquement la nouvelle source.

L’ancien profil est isolé dans `north-female-before.reference.json`, importé uniquement par l’essai. Il n’est pas enregistré dans les catalogues de campagne. L’atlas original est conservé, car d’autres personnages l’utilisent encore.

## Essai et comparaison ciblés

Le bouton d’accueil s’appelle désormais « Essai des animations ». Il s’ouvre sur la nouvelle Guerrière et propose cinq entrées : la nouvelle version, une seule ancienne version, la Pillarde hache validée, le Pillard hache validé et le Guerrier du Nord masculin validé. Les autres variantes validées restent en campagne mais sont retirées de ce sélecteur de revue.

La page `/validation/vikings-a-revoir/` montre ces cinq modèles à une échelle commune et sur le vrai terrain tactique du prologue. La page `/validation/chevaliers/` montre les cinq classes de base, homme et femme, soit dix variantes. La magie offensive et les soins du Sorcier conservent la même apparence : le moteur n’équipe pas un second personnage lorsqu’il soigne, donc cette apparence n’est pas artificiellement dupliquée dans la comparaison. Les profils graphiques partagés entre les sexes sont signalés.

Chaque page propose un zoom et une image téléchargeable. Les manifestes `chevaliers-inventaire.json` et `vikings-a-revoir-inventaire.json` enregistrent les sources et positions. Les comparaisons ne déplacent pas d’équipe ni ne modifient les sauvegardes.

## Constats sur les Chevaliers, avant toute reprise

- Les Lanciers et les Épéistes emploient chacun un profil partagé pour les deux sexes.
- L’Arbalétrière et la Sorcière ont une définition de source inférieure aux nouvelles planches vikings.
- Les Hommes d’armes ont des silhouettes plus trapues. La comparaison permet de décider si leur style doit être repris.
- Les dessins et les classes restent inchangés : la prochaine étape consiste à choisir les corrections avec l’utilisateur.

## Vérifications

203 tests automatisés réussis : 54 visuels et 149 systèmes. La couverture inclut les sept profils harmonisés, les 23 poses de la nouvelle Guerrière, l’unique ancien modèle dans la revue, les trois références, les dix variantes de Chevaliers et les positions praticables des comparaisons. Les parcours navigateur vérifient les sources, les attaques, les esquives, le critique, l’absence de parade sans bouclier, la navigation entre comparaisons et leur affichage mobile.
