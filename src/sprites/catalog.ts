export type Clip = {
  source: string;
  columns: number;
  rows: number;
  row: number;
  frames: number[];
  fps: number;
};
export type ClipDefinition = Clip | { reuse: string };
export type SpriteProfile = {
  classId: string;
  gender: "male" | "female" | "any";
  equipment: string;
  state: string;
  clips: Record<string, ClipDefinition>;
};
export const animationNames: Record<string, string> = {
  idle: "Repos",
  move: "Déplacement",
  attack: "Attaque",
  counter: "Riposte",
  damage: "Dégâts",
  death: "Mort",
  evade: "Esquive",
  block: "Parade",
  heal: "Soins",
  banner: "Planter la bannière",
  fortify: "Fortification",
  summon: "Invocation",
  area: "Attaque de zone",
  charge: "Charge",
};
export const profileKey = (
  p: Pick<SpriteProfile, "classId" | "gender" | "equipment" | "state">,
) => [p.classId, p.gender, p.equipment, p.state].join(":");
export function buildSpriteCatalog(inputs: unknown[]) {
  const profiles = new Map<string, SpriteProfile>(),
    errors: string[] = [];
  for (const input of inputs) {
    const data = input as { profiles?: SpriteProfile[] };
    if (!Array.isArray(data?.profiles)) {
      errors.push("Description de sprites sans liste profiles");
      continue;
    }
    for (const p of data.profiles) {
      if (
        !p.classId ||
        !["male", "female", "any"].includes(p.gender) ||
        !p.equipment ||
        !p.state ||
        !p.clips
      ) {
        errors.push("Profil incomplet");
        continue;
      }
      const key = profileKey(p),
        old = profiles.get(key),
        merged = { ...p, clips: { ...old?.clips } };
      for (const [name, clip] of Object.entries(p.clips)) {
        if ("reuse" in clip) {
          if (typeof clip.reuse !== "string") {
            errors.push(`${key} : alias invalide`);
            continue;
          }
        } else if (
          !clip.source ||
          !Number.isInteger(clip.columns) ||
          clip.columns < 1 ||
          !Number.isInteger(clip.rows) ||
          clip.rows < 1 ||
          !Number.isInteger(clip.row) ||
          clip.row < 0 ||
          clip.row >= clip.rows ||
          !Array.isArray(clip.frames) ||
          !clip.frames.length ||
          clip.frames.some(
            (f) => !Number.isInteger(f) || f < 0 || f >= clip.columns,
          ) ||
          !Number.isFinite(clip.fps) ||
          clip.fps <= 0
        ) {
          errors.push(`${key} / ${name} : découpage invalide`);
          continue;
        }
        if (
          merged.clips[name] &&
          JSON.stringify(merged.clips[name]) !== JSON.stringify(clip)
        ) {
          errors.push(`${key} / ${name} : description en double`);
          continue;
        }
        merged.clips[name] = clip;
      }
      profiles.set(key, merged);
    }
  }
  return { profiles: [...profiles.values()], errors };
}
export function resolveClip(
  p: SpriteProfile | undefined,
  id: string,
  seen = new Set<string>(),
): Clip | undefined {
  if (!p || seen.has(id)) return;
  seen.add(id);
  const c = p.clips[id];
  return c && ("reuse" in c ? resolveClip(p, c.reuse, seen) : c);
}
export function findProfile(
  profiles: SpriteProfile[],
  classId: string,
  gender: string,
  equipment: string,
  state: string,
) {
  return profiles.find(
    (p) =>
      p.classId === classId &&
      (p.gender === gender || p.gender === "any") &&
      p.equipment === equipment &&
      p.state === state,
  );
}
