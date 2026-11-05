import { readdir, readFile, writeFile } from "node:fs/promises";
import {
  buildSpriteCatalog,
  profileKey,
  resolveClip,
  animationNames,
} from "../src/sprites/catalog";
import { buildCombatSkin } from "../src/sprites/combat-skin-core";
import { visualClasses } from "../src/sprites/visual-classes";
import { requiredAnimations } from "../src/sprites/requirements";
import anchors from "../src/assets/tactical/combat-anchors.json";
const path = "src/assets/tactical/",
  files = (await readdir(path)).sort();
const read = async (f: string) => JSON.parse(await readFile(path + f, "utf8"));
const originals = buildSpriteCatalog(
  await Promise.all(files.filter((f) => f.endsWith(".sprite.json")).map(read)),
).profiles;
const replacements = new Map(
  (await Promise.all(files.filter((f) => f.endsWith(".combat.json")).map(read)))
    .flatMap((d) => d.profiles)
    .map((p) => [profileKey(p), p]),
);
const profiles = originals.map((p) => {
  const skin = buildCombatSkin(p, replacements.get(profileKey(p)))!,
    c = visualClasses[p.classId];
  const animations = requiredAnimations(
    c,
    p,
    Object.keys(skin.profile.clips),
  ).map((name) => {
    const clip = resolveClip(skin.profile, name),
      issue = skin.issues.filter((i) => i.animation === name);
    const status = !clip
      ? "missing"
      : clip.status === "provisional" || clip.frames.length < 2 || issue.length
        ? "provisional"
        : skin.profile.clips[name] && "reuse" in skin.profile.clips[name]
          ? "reused"
          : "available";
    return {
      name,
      status,
      source: clip?.source,
      frames: clip?.frames.length ?? 0,
      cells:
        clip?.cells ??
        clip?.frames.map((column) => ({ row: clip.row, column })),
      impactFrame: clip?.impactFrame,
      notes: [clip?.note ?? "", ...issue.map((i) => i.reason)].filter(Boolean),
    };
  });
  return {
    skinId: skin.id,
    classId: p.classId,
    className: c.name,
    faction: c.faction,
    stage: c.stage,
    gender: p.gender,
    equipment: p.equipment,
    state: p.state,
    mounted: skin.mounted,
    anatomicalHeight: skin.mounted ? 190.4 : p.state === "bear" ? 148 : 136,
    createdAtlas: !!replacements.get(profileKey(p)),
    animations,
    issues: skin.issues,
    complete: false,
  };
});
const classes = Object.values(visualClasses).map((c) => ({
  id: c.id,
  name: c.name,
  faction: c.faction,
  stage: c.stage,
  skins: profiles.filter((p) => p.classId === c.id).map((p) => p.skinId),
  missingGenders:
    c.faction === "enemy"
      ? []
      : ["male", "female"].filter(
          (g) =>
            !profiles.some(
              (p) =>
                p.classId === c.id && (p.gender === g || p.gender === "any"),
            ),
        ),
}));
const report = {
  date: "2026-11-05",
  reference: "Kit-animations-combat-V2.zip",
  profiles: profiles.length,
  classes,
  skins: profiles,
  technicalRenderingIsNotArtisticCompletion: true,
};
await writeFile(
  "docs/COMBAT-V3-INVENTORY.json",
  JSON.stringify(report, null, 2) + "\n",
);
const lines = [
  "# Inventaire V3 — classes, promotions et animations",
  "",
  "Les 41 entrées visuelles et 55 profils sont parcourus. Une pose présente, une réutilisation et un dessin encore manquant sont distingués ; le passage des tests ne certifie pas une finition artistique parfaite.",
  "",
  "Voir [le bilan des corrections](COMBAT-V3-REPORT.md) et [les ressources et cellules réellement utilisées](COMBAT-V3-ART.json).",
  "",
  "## Classes et promotions",
  "",
  "| Classe | Faction / stade | Profils | Variantes de sexe absentes |",
  "| --- | --- | --- | --- |",
  ...classes.map(
    (c) =>
      `| ${c.name} | ${c.faction} / ${c.stage} | ${c.skins.length} | ${c.missingGenders.join(", ") || "—"} |`,
  ),
  "",
  "## Animations par profil",
  "",
  "| Skin | Poses présentes ou réutilisées | Provisoires | Manquantes |",
  "| --- | --- | --- | --- |",
  ...profiles.map(
    (p) =>
      `| ${p.skinId} | ${p.animations
        .filter((a) => a.status === "available" || a.status === "reused")
        .map((a) => `${a.name} (${a.frames})`)
        .join(", ")} | ${
        p.animations
          .filter((a) => a.status === "provisional")
          .map((a) => a.name)
          .join(", ") || "—"
      } | ${
        p.animations
          .filter((a) => a.status === "missing")
          .map((a) => a.name)
          .join(", ") || "—"
      } |`,
  ),
  "",
];
await writeFile("docs/COMBAT-V3-INVENTORY.md", lines.join("\n"));
console.log(
  JSON.stringify({
    classes: classes.length,
    profiles: profiles.length,
    movement: profiles.filter((p) =>
      p.animations.some((a) => a.name === "move" && a.frames >= 3),
    ).length,
    missing: profiles.reduce(
      (n, p) => n + p.animations.filter((a) => a.status === "missing").length,
      0,
    ),
  }),
);
