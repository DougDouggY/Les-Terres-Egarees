# Contrat d'un skin de combat

Le moteur ne connaît pas les classes : il reçoit `skinId`, `variant`, `friendly` et `ranged`. Les noms `v2-pillard`, `guard-sword`, etc. sont des exemples de skins dans le manifeste. Un chevalier peut être ajouté sous un nouvel identifiant sans devenir artificiellement un Huscarl.

## Échelle et ancre

- Canvas de référence : 640 × 320 ; sol des pieds à y=278 ; repos gauche x=185, repos droite x=455.
- Les images fournies utilisent majoritairement des rectangles de 1024 × 1024, corps de référence 320 pixels, échelle de dessin 0,45, corps apparent d'environ 144 pixels.
- **Les nouveaux fichiers n'ont pas à mesurer 1024 × 1024.** Chaque rectangle et chaque ancre doivent correspondre à leur taille réelle.
- `ax`, `ay` sont relatifs au rectangle de la pose. `x`, `y` désignent le coin de ce rectangle dans l'atlas. L'ancre des pieds n'est pas automatiquement le centre du rectangle ni la pointe de l'arme.
- L'image source regarde vers la droite ; le personnage placé à droite est retourné horizontalement autour de son ancre.
- Pour un autre format, normaliser à une hauteur de corps commune ; modifier à la fois l'échelle de dessin et celle du calcul de `front()`. Ne pas agrandir tout un chevalier parce que sa lance est plus longue.

## Poses minimales et étendues

| Index de référence | Fonction | Besoin artistique |
|---:|---|---|
| 0 | Repos | Posture stable, pieds identifiables |
| 1 | Préparation | Arme réellement armée ; silhouette différente du repos |
| 2 | Frappe / lâcher du tir | Arme avancée ; contact lisible |
| 3 | Défense / réaction | Bouclier ou arme placé pour arrêter l'attaque |
| 4 | Interception | Optionnel dans le moteur actuel ; peut devenir une vraie défense contre projectile |
| 5 | Esquive | Optionnel, corps réellement écarté ; le moteur ancien revient au repos si cette pose manque |
| 6 | Préparation secondaire | Pour deux armes : autre bras/arme préparé, continuité depuis le premier coup |
| 7 | Frappe secondaire | Autre trajectoire et autre arme ; pas un copier-coller de la frappe principale |
| 8 | Récupération secondaire | Retour cohérent après la deuxième frappe |

Les modèles de référence à deux armes comportent bien neuf frames par ligne. Les autres modèles ont souvent quatre ou six frames. Le fichier `inventaire-des-poses.json` l'indique précisément. L'adaptateur V2 **refuse une séquence à deux armes si les poses 6–8 manquent**, au lieu de masquer le problème.

Les armes ne changent pas de main par magie entre deux poses. Si un skin tient épée à droite et bouclier à gauche, garder cette organisation à travers repos, attaque et défense, puis laisser le miroir de la scène retourner l'ensemble.

## Contact et défense

Le moteur de référence n'est pas un simulateur de collision de lames. `front` est une distance approximative depuis l'ancre vers l'avant de la pose, utilisée pour régler l'approche. La bonne valeur se mesure sur le dessin, pas au hasard selon le nom de la classe.

Pour les nouveaux personnages, il est utile d'annoter, par pose et en coordonnées locales au rectangle :

- `feet` : point fixe de placement ;
- `weaponTip` : bout de l'arme au contact ;
- `shieldCenter` : point visé pour un blocage ;
- `projectileOrigin` : départ de la flèche à l'arc ;
- `projectileTarget` : zone d'arrivée sur le corps ou le bouclier.

Ces points supplémentaires sont des recommandations pour le nouveau jeu : le moteur ancien ne les exploite pas automatiquement. Il utilise notamment un y de projectile fixe à 205. Pour un chevalier très différent, un archer à genoux ou un grand bouclier, il faut remplacer ces constantes par les points annotés.

## Ce qui produit souvent une mauvaise animation

| Symptôme | Vérification prioritaire |
|---|---|
| Pieds qui sautent entre deux poses | `ax/ay`, marges transparentes, échelle par pose |
| Arme qui traverse le défenseur | `front`, longueur visuelle, pose utilisée à l'impact |
| Arme qui s'arrête dans le vide | Distance d'approche trop courte, mauvais côté après miroir |
| Deuxième coup ressemblant à une parade | Pose secondaire manquante et mauvais fallback |
| Petit retour en arrière entre les deux armes | Combo non lié, scène recréée ou retour spatial lancé trop tôt |
| Double coup identique et mécanique | Une seule frappe réutilisée ; manque de poses secondaires |
| Parade sans contact | Mauvaise pose de défense ou mauvaise phase du bouclier |
| Flèche qui flotte devant l'arc | Origine du projectile ou moment du lâcher erroné |
| Chevalier trop grand à cause d'une lance | Normalisation par rectangle complet au lieu du corps |
| PV qui diminuent deux fois | Mécanique appliquée dans le résolveur puis dans le lecteur d'animation |

On peut conserver le format artistique détaillé : un atlas est une organisation de fichiers, pas une consigne de simplifier les dessins. Pour évaluer l'adaptation, comparer d'abord un seul duel identique, à vitesse normale puis au ralenti.
