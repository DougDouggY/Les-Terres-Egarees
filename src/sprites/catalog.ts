export type Clip = {
  frameSize?: { width: number; height: number };
  impactFrame?: number;
  recolorEdges?: boolean;
  cells?: { row: number; column: number }[];
  loop?: boolean;
  status?: "functional" | "provisional";
  note?: string;
  recolor?: "magenta" | "blue";
  source: string;
  columns: number;
  rows: number;
  row: number;
  frames: number[];
  fps: number;
};
export type ClipDefinition =
  | Clip
  | { reuse: string; status?: "functional" | "provisional"; note?: string };
export type SpriteProfile = {
  lot?: number;
  note?: string;
  classId: string;
  gender: "male" | "female" | "any";
  equipment: string;
  state: string;
  clips: Record<string, ClipDefinition>;
};
export const animationNames: Record<string, string> = {
  attack_offhand: "Frappe de la seconde arme",
  combat_idle: "Garde de combat (nouvelle planche)",
  combat_move: "Pas de combat (nouvelle planche)",
  combat_damage: "Réaction de combat (pose provisoire)",
  attack_again: "Seconde frappe simple (variante)",
  critical: "Critique",
  transform: "Transformation en ours",
  buff: "Amélioration",
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
  reload: "Rechargement",
  intercept: "Interception",
};
/** Choose drawing only; weapon counts, strike groups and combat rules stay unchanged. */
export function strikeAnimation(
  p: SpriteProfile | undefined,
  strike: { weaponIndex?: number; counter?: boolean; critical?: boolean },
) {
  if (strike.weaponIndex === 1 && resolveClip(p, "attack_offhand"))
    return "attack_offhand";
  if (strike.critical && resolveClip(p, "critical")) return "critical";
  return strike.counter ? "counter" : "attack";
}
export const profileKey = (
  p: Pick<SpriteProfile, "classId" | "gender" | "equipment" | "state">,
) => [p.classId, p.gender, p.equipment, p.state].join(":");
export function buildSpriteCatalog(inputs: unknown[]) {
  const profiles = new Map<string, SpriteProfile>(),
    errors: string[] = [];
  for (const input of inputs) {
    const data = input as { profiles?: SpriteProfile[]; override?: boolean };
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
        merged = { ...old, ...p, clips: { ...old?.clips } };
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
          (clip.impactFrame !== undefined &&
            (!Number.isInteger(clip.impactFrame) ||
              clip.impactFrame < 0 ||
              clip.impactFrame >= clip.frames.length)) ||
          (clip.frameSize &&
            ![clip.frameSize.width, clip.frameSize.height].every(
              (n) => Number.isFinite(n) && n > 0,
            )) ||
          !Number.isFinite(clip.fps) ||
          clip.fps <= 0 ||
          (clip.cells &&
            (clip.cells.length !== clip.frames.length ||
              clip.cells.some(
                (c) =>
                  !Number.isInteger(c.row) ||
                  c.row < 0 ||
                  c.row >= clip.rows ||
                  !Number.isInteger(c.column) ||
                  c.column < 0 ||
                  c.column >= clip.columns,
              )))
        ) {
          errors.push(`${key} / ${name} : découpage invalide`);
          continue;
        }
        if (
          !data.override &&
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
  if (!c) return;
  if (!("reuse" in c)) return c;
  const resolved = resolveClip(p, c.reuse, seen);
  return (
    resolved &&
    (c.status || c.note
      ? {
          ...resolved,
          status: c.status ?? resolved.status,
          note: c.note ?? resolved.note,
        }
      : resolved)
  );
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

export function animationStatus(
  profile: SpriteProfile | undefined,
  id: string,
) {
  const clip = resolveClip(profile, id);
  if (!clip) return "missing" as const;
  const distinct = new Set(
    clip.cells?.map((c) => `${c.row}:${c.column}`) ??
      clip.frames.map((c) => `${clip.row}:${c}`),
  );
  if (clip.status === "provisional" || distinct.size < 2 || !clip.recolor)
    return "provisional" as const;
  if (profile?.clips[id] && "reuse" in profile.clips[id])
    return "reused" as const;
  return "functional" as const;
}
export const statusNames = {
  reused: "Réutilisée",
  functional: "Fonctionnelle",
  provisional: "Provisoire",
  missing: "Manquante",
};
