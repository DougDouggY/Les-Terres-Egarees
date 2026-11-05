export const teamPalette = {
  blue: { name: "Bleu", rgb: [63, 132, 231] },
  red: { name: "Rouge", rgb: [216, 66, 65] },
  yellow: { name: "Jaune", rgb: [234, 193, 58] },
  green: { name: "Vert", rgb: [65, 169, 103] },
  purple: { name: "Violet", rgb: [155, 92, 203] },
  orange: { name: "Orange", rgb: [232, 133, 48] },
  pink: { name: "Rose vif", rgb: [255, 45, 161] },
  black: { name: "Noir / anthracite", rgb: [63, 69, 80] },
  white: { name: "Blanc", rgb: [228, 228, 214] },
} as const;
export type TeamColor = keyof typeof teamPalette;
export type TeamColors = {
  player1: TeamColor;
  player2: TeamColor;
  enemies: TeamColor;
};
export const defaultTeamColors: TeamColors = {
  player1: "blue",
  player2: "yellow",
  enemies: "pink",
};
export function isTeamColor(value: unknown): value is TeamColor {
  return typeof value === "string" && Object.hasOwn(teamPalette, value);
}
export function normalizeTeamColors(
  value: unknown,
  allowPinkPlayers = false,
): TeamColors {
  const v = (value ?? {}) as Partial<TeamColors>;
  const result = { ...defaultTeamColors };
  for (const key of ["player1", "player2", "enemies"] as const)
    if (isTeamColor(v[key])) result[key] = v[key];
  result.enemies = defaultTeamColors.enemies;
  if (!allowPinkPlayers) {
    if (result.player1 === "pink") result.player1 = "blue";
    if (result.player2 === "pink") result.player2 = "yellow";
  }
  if (result.player1 === result.player2)
    result.player2 = result.player1 === "yellow" ? "blue" : "yellow";
  return result;
}
export function setTeamColors(
  game: { teamColors?: TeamColors },
  value: TeamColors,
) {
  if (!Object.values(value).every(isTeamColor)) throw Error("Couleur inconnue");
  if (value.player1 === value.player2)
    throw Error("Les deux joueurs doivent avoir des couleurs distinctes.");
  game.teamColors = { ...value, enemies: defaultTeamColors.enemies };
}
export function colorForOwner(
  colors: TeamColors | undefined,
  owner: number,
): TeamColor {
  const c = colors ?? defaultTeamColors;
  return owner === 1
    ? c.player1
    : owner === 2
      ? c.player2
      : defaultTeamColors.enemies;
}

export function setPlayableTeamColors(
  game: { teamColors?: TeamColors },
  value: TeamColors,
) {
  if (value.player1 === "pink" || value.player2 === "pink")
    throw Error(
      "Le rose vif est réservé aux ennemis en partie. La galerie permet de le tester librement.",
    );
  setTeamColors(game, value);
}
