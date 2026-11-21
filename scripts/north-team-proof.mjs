import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const p = await b.newPage();
  await p.goto("http://localhost:5173");
  const result = await p.evaluate(async () => {
    const E = await import("/src/engine.ts"),
      R = await import("/src/sprites/resources.ts"),
      S = await import("/src/sprites/combat-skins.ts"),
      C = await import("/src/sprites/catalog.ts"),
      G = await import("/src/sprites/geometry.ts");
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 2180;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#18212a";
    ctx.fillRect(0, 0, 960, 2180);
    ctx.fillStyle = "#ead5a5";
    ctx.font = "bold 25px Arial";
    ctx.fillText("Couleurs d’équipe — ressources réellement utilisées", 20, 38);
    const rows = [];
    let y = 70;
    for (const [cls, gender, weapon, title] of [
      ["raider", "male", "axe_shield", "Pillard · hache"],
      ["raider", "female", "axe_shield", "Pillarde · hache"],
      ["raider", "male", "sword_shield", "Pillard · épée"],
      ["raider", "female", "sword_shield", "Pillarde · épée"],
      ["north_warrior", "male", "axe", "Guerrier du Nord"],
      ["north_warrior", "female", "axe", "Nouvelle Guerrière du Nord"],
      ["hunter", "female", "bow", "Chasseuse"],
    ]) {
      const u = E.makeClassUnit("proof", 1, 1, cls, title, 0, 0, gender);
      u.activeWeaponId = weapon;
      E.syncWeapon(u);
      const s = S.combatSkin(R.unitSpriteProfile(u)).profile,
        c = C.resolveClip(s, "idle");
      await R.spriteImage(c.source).decode();
      ctx.fillStyle = "#26333f";
      ctx.fillRect(10, y, 940, 290);
      ctx.fillStyle = "#eef2f6";
      ctx.font = "20px Arial";
      ctx.fillText(title, 24, y + 27);
      for (const [i, color] of ["blue", "pink"].entries())
        R.drawResourceFrame(
          ctx,
          s,
          "idle",
          0,
          160 + i * 420,
          y + 260 - 300 * 0.96,
          240,
          300,
          true,
          color,
          "world",
          { scale: 200 / G.profileMetrics(s).references.get(c.source) },
        );
      rows.push({
        cls,
        gender,
        weapon,
        gap: G.anatomicalContactGap(s, s, 136),
        shield: E.hasShield(u),
        block: !!C.resolveClip(s, "block"),
      });
      y += 300;
    }
    return { image: canvas.toDataURL(), rows };
  });
  await writeFile(
    "public/validation/vikings/couleurs-equipes.png",
    Buffer.from(result.image.split(",")[1], "base64"),
  );
  await writeFile(
    "docs/references/north-contact-audit.json",
    JSON.stringify(result.rows, null, 2) + "\n",
  );
  console.log(result.rows);
} finally {
  await b.close();
}
