# Les raccords qui donnent le rythme de la référence

## 1. Ne pas confondre les différents doubles coups

Une classe rapide avec une seule arme peut obtenir deux attaques : deux séquences normales sont alors possibles. Une classe à deux armes possède une frappe principale et une frappe secondaire, avec des poses différentes. Quatre coups peuvent se composer de deux blocs de deux frappes. Le nombre et l'ordre des frappes viennent des règles du nouveau jeu, pas de l'animateur.

Dans le cas de référence à deux armes :

1. Première frappe : `comboIndex: 0`, `comboNext: true`, durée 620 ms.
2. Deuxième frappe : `comboIndex: 1`, `comboNext: false`, durée 500 ms.
3. Les deux entrées sont mises en file immédiatement ; on attend la fin du bloc ensuite.
4. L'attaquant reste au contact entre les deux. Les poses 6–8 prennent le relais.

**Le temps de la deuxième frappe n'est pas linéairement identique à celui de la première.** Lorsqu'elle est liée à la précédente, le code remappe le temps normalisé :

```js
p = elapsed < 0.32
  ? elapsed / 0.32 * 0.58
  : 0.58 + (elapsed - 0.32) / 0.68 * 0.42;
```

L'impact arrive donc à 32 % des 500 ms, soit **160 ms** après le début du deuxième coup. Le premier impact arrive à 58 % de 620 ms, soit **359,6 ms**. Pour le bloc complet, les contacts sont vers **359,6 ms** puis **780 ms**, fin du bloc à **1 120 ms**. Rejouer deux frappes normales de 1 250 ms ne produit pas ce rythme.

## 2. Une parade est une petite séquence complète

Durée de référence : 1 550 ms. La défense apparaît vers p=0,50 ; contact à p=0,58 ; reprise d'initiative entre p=0,69 et 0,91 ; pose de riposte à partir de p=0,75.

Le défenseur ne se contente pas d'un texte « parade ». Son dessin, son déplacement de riposte et le recul/éclaircissement de l'attaquant doivent raconter ce qui se passe. Si la portée ou l'état interdit la riposte, fournir `noCounter: true`. Une riposte ratée se distingue d'une parade sans riposte.

Dans la référence, le flash de riposte commence à p=0,75 et les PV de l'attaquant sont affichés à p=0,79. C'est un léger décalage réel du code. Pour reproduire exactement, conserver ces valeurs. Pour une refonte, on peut choisir un événement de contact unique, mais il faut alors l'assumer et vérifier le ressenti au lieu d'altérer les phases accidentellement.

## 3. Une interception de flèche n'est pas une parade de mêlée

L'archer reste à sa position de tir. Le projectile part à p=0,40 et arrive à p=0,58 ; le bouclier est en défense au contact. Le résultat `intercepted: true` garde les PV inchangés. La référence affiche ensuite une flèche fichée au bouclier. Une riposte éventuelle relève des règles du nouveau jeu ; elle ne doit pas être créée automatiquement par le seul effet visuel.

Pour les nouveaux skins, le point de départ de la flèche et le centre du bouclier doivent correspondre aux dessins. Reprendre y=205 partout sans vérifier ne suffit pas.

## 4. La référence sait animer, pas réparer des sprites incompatibles

Une silhouette, une échelle ou une ancre différente à chaque frame fait trembler le personnage. Une arme qui change de main entre deux images crée un saut. Une pose de bouclier mal orientée rend une parade fausse même si le timing est exact.

Le travail de l'autre Codex doit donc porter d'abord sur les métadonnées **et** la qualité des poses. Les fichiers fournis montrent un exemple concret de ce qui fonctionne ; ils ne rendent pas automatiquement n'importe quelle planche cohérente.

## 5. Exiger une comparaison vérifiable

Faire tourner la référence et l'adaptation sur le même scénario, avec le même ordre de frappes et les mêmes résultats forcés. Comparer les phases repos → préparation → contact → défense/riposte → retour. Ne pas comparer deux combats aléatoires différents.

Si cela reste mauvais, transmettre au prochain diagnostic : le JSON exporté du comparateur, le manifeste des nouveaux sprites, les planches utilisées et idéalement une courte capture de l'animation. Cela permettra de distinguer un problème de dessin, d'ancre, de miroir, de contact ou de file de combos.
