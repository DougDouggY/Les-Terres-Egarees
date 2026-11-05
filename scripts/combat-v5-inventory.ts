import fs from "node:fs";
import {
  buildSpriteCatalog,
  profileKey,
  resolveClip,
  damageFrame,
} from "../src/sprites/catalog";
import { buildCombatSkin } from "../src/sprites/combat-skin-core";
import { visualClasses } from "../src/sprites/visual-classes";
const dir = "src/assets/tactical/",
  files = fs.readdirSync(dir).sort(),
  read = (f: string) => JSON.parse(fs.readFileSync(dir + f, "utf8"));
const raw = buildSpriteCatalog(
  files.filter((f) => f.endsWith(".sprite.json")).map(read),
).profiles;
const replace = new Map(
  files
    .filter((f) => f.endsWith(".combat.json"))
    .flatMap((f) => read(f).profiles)
    .map((p) => [profileKey(p), p]),
);
const profiles = raw.map((p) => {
  const skin = buildCombatSkin(p, replace.get(profileKey(p)))!,
    out = skin.profile;
  return {
    id: skin.id,
    class: visualClasses[p.classId].name,
    gender: p.gender,
    mounted: skin.mounted,
    animations: Object.keys(out.clips).map((name) => {
      const c = resolveClip(out, name)!;
      return {
        name,
        frames: c.frames.length,
        source: c.source,
        status: c.status,
        notes: c.note,
        damageFrame: name === "damage" ? damageFrame(c) : undefined,
      };
    }),
    issues: skin.issues,
  };
});
fs.mkdirSync("artifacts/combat-v5", { recursive: true });
fs.writeFileSync(
  "artifacts/combat-v5/inventory.json",
  JSON.stringify(profiles, null, 2),
);
const classes = [...new Set(profiles.map((p) => p.class))];
console.log(
  JSON.stringify(
    {
      profiles: profiles.length,
      classes: classes.length,
      female: profiles.filter((p) => p.gender === "female").length,
      male: profiles.filter((p) => p.gender === "male").length,
      any: profiles.filter((p) => p.gender === "any").length,
      missing: profiles.flatMap((p) =>
        p.issues.map((i) => ({ id: p.id, ...i })),
      ),
    },
    null,
    2,
  ),
);
