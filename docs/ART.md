# Bible artistique

Les Terres Égarées : côte septentrionale, village détruit autour d’un monastère gothique, mer pétrole, brume vert-de-gris, os ivoire, pierre froide et accents cuivre. Interface parchemin sombre et laiton vieilli. Illustrations narratives peintes, carte régionale aux textures originales et combattants animés en pixel art. Aucun asset Fire Emblem utilisé.

Eirik : chef nordique, barbe rousse, cape bleu pétrole, hache et bouclier rond. Astrid : éclaireuse nordique, arc, cuir brun. Ysilde : capitaine, cheveux noirs, cape ocre, épée et écu. Gaspard : arbalétrier, cuir et cotte de mailles. Expédition II : variantes de noms et couleurs (Bryn, Solveig, Maël, Alix), sans changer l'archétype.

La référence GBA est structurelle : cases carrées, silhouettes lisibles, routes continues, obstacles à empreinte explicite et surimpressions distinctes. Référence technique consultée : FireEmblemUniverse/fireemblem8u, include/bmmap.h et src/bmmap.c (https://github.com/FireEmblemUniverse/fireemblem8u). La structure du terrain, les tailles de cartes et les tables de terrain montrent le lien entre tuiles et règles de déplacement. Aucun graphisme original ni code du jeu n'a été importé. La carte Fire Emblem fournie ensuite par l’utilisateur sert de référence d’échelle et d’organisation spatiale, sans reprise de ses graphismes.

L’atlas régional comprend des matériaux de sol et un village cohérent de 3 × 3 cases. Celui-ci est dessiné comme un seul décor, tout en conservant neuf cases logiques et une entrée au milieu sud. Épave et convoi : une case chacun. L’eau, les plages et les chemins raccordent les textures en coordonnées monde.

Les bois sont dessinés en bouquets irréguliers avec une marge d’herbe ; des arbres traversent seulement les bords partagés par deux cases boisées. Les pics montagneux alternent entre trois compositions distinctes, sans raccord obligatoire. Ces nouveaux détails sont dessinés dans le moteur (`src/landscape.ts`) sans génération d’images supplémentaire. Les illustrations de cinématiques restent inchangées.

## Retour aux forêts peintes raccordées

Les arbres coniques procéduraux sont remplacés par les bouquets peints de
l’atlas régional d’origine. Des masques doux retirent les angles du fond ;
des bouquets supplémentaires relient les bords partagés et les jonctions
complètes de quatre cases. Les coins concaves sur la prairie restent libres.
Les trois compositions de montagnes sont abaissées de 25 %, avec leur base
au même niveau. Aucune nouvelle image générée.
