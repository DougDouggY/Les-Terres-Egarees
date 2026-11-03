import { normalizeTeamColors, type TeamColors } from "./game/team-colors";
export const teamPreferenceKey = "lte-team-colors-v1";
export function readTeamPreferences(): TeamColors {
  try {
    return normalizeTeamColors(
      JSON.parse(localStorage.getItem(teamPreferenceKey) ?? "null"),
    );
  } catch {
    return normalizeTeamColors(null);
  }
}
export function writeTeamPreferences(value: TeamColors) {
  localStorage.setItem(teamPreferenceKey, JSON.stringify(value));
}

const galleryKey = "lte-gallery-team-colors-v1";
export function readGalleryTeamPreferences(): TeamColors {
  try {
    const raw = localStorage.getItem(galleryKey);
    return raw
      ? normalizeTeamColors(JSON.parse(raw), true)
      : readTeamPreferences();
  } catch {
    return readTeamPreferences();
  }
}
export function writeGalleryTeamPreferences(value: TeamColors) {
  localStorage.setItem(galleryKey, JSON.stringify(value));
}
