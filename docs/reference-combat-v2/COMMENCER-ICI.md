# Kit V2 — Référence de combat à transmettre à Codex

Ce dossier complète le premier kit et inclut ses sprites et son moteur. Il n'a pas été intégré au jeu : il sert uniquement à guider l'autre projet.

1. Donner **PROMPT-A-DONNER-A-CODEX.md** à l'autre Codex avec le dossier complet.
2. Lui faire lire **CONTRAT-DES-NOUVEAUX-SPRITES.md** et **POINTS-QUI-CHANGENT-TOUT.md**.
3. Lancer **comparateur.html** sur un petit serveur local : `python -m http.server 8020`, puis http://127.0.0.1:8020/comparateur.html (Python doit être installé).
4. Examiner les treize cas, notamment deux haches, deux épées, parade/riposte et interception de flèche. Pause et ralenti sont disponibles dans la fenêtre de combat.
5. Remplacer un seul couple de sprites après avoir reproduit la référence. Utiliser le diagnostic JSON si l'adaptation diverge.

Nouveautés par rapport au premier kit : exemples exécutables de combos et de ripostes ; adaptateur sans dépendance aux noms des classes ; refus explicite des poses secondaires manquantes ; inventaire des poses ; tests automatisés du montage des séquences et de leurs états de PV.

La démonstration force les résultats pour comparer les animations. Elle ne teste pas l'équilibrage, les chances de parade ni la logique de combat de l'autre jeu. Les costumes de chevaliers ne sont pas inclus ; ils doivent être fournis par ce nouveau projet, avec des métadonnées cohérentes.
