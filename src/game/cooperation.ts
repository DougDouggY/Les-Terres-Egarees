import type { Campaign, Unit } from "./types";
export type SessionView = { mode: "local" } | { mode: "coop"; owner: 1 | 2 };
let view: SessionView = { mode: "local" };
/** Connection adapter hook. The future server must authenticate this owner for every command. */
export function setSessionView(next: SessionView) {
  view = next;
}
export const sessionView = () => view;
export const controlsOwner = (owner: number, v = view) =>
  owner !== 0 && (v.mode === "local" || v.owner === owner);
export const canSwitchExpedition = (v = view) => v.mode === "local";
export function rewardVisible(
  s: Campaign,
  u: Unit,
  actingOwner: number,
  v = view,
) {
  return (
    u.owner === actingOwner &&
    actingOwner === s.active &&
    controlsOwner(u.owner, v)
  );
}
export function sharedChapterScene(id: string) {
  return (
    id.startsWith("c1-") ||
    id === "prologue" ||
    id === "meeting" ||
    id === "alliance"
  );
}
