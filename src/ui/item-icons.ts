const atlas = new URL("../assets/ui/inventory-icons.png", import.meta.url).href;

/** Row-major atlas order. Equipment IDs, never just weapon categories. */
export const inventoryIconIds = [
  "sword",
  "axe",
  "lance",
  "bow",
  "crossbow",
  "sword_shield",
  "axe_shield",
  "lance_shield",
  "twin_axes",
  "twin_swords",
  "great_sword",
  "great_axe",
  "spell",
  "healing_focus",
  "bandages",
  "banner_lance",
  "rusty_sword",
  "training_axe",
  "training_sword",
  "training_lance",
  "claws",
] as const;
export function inventoryIconPosition(id: string) {
  if (id === "claws") return { x: 0, y: 0, standalone: true };
  const index = inventoryIconIds.findIndex((key) => key === id);
  return index < 0
    ? undefined
    : { x: (index % 5) * 25, y: (Math.floor(index / 5) * 100) / 3 };
}
export function inventoryIcon(id: string) {
  const pos = inventoryIconPosition(id);
  const image = pos?.standalone
    ? new URL("../assets/ui/inventory-claws.png", import.meta.url).href
    : atlas;
  return pos
    ? `<span class="item-icon${pos.standalone ? " item-icon-standalone" : ""}" aria-hidden="true" data-item-icon="${id}" style="background-image:url('${image}');background-position:${pos.x}% ${pos.y}%"></span>`
    : '<span class="item-icon item-icon-unknown" aria-hidden="true">?</span>';
}
