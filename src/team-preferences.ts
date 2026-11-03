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
