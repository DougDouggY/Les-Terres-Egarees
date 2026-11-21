import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const out = "public/validation/vikings/animations";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173/");
  const result = await page.evaluate(async () => {
    const E = await import("/src/engine.ts"),
      R = await import("/src/sprites/resources.ts"),
      S = await import("/src/sprites/combat-skins.ts"),
      C = await import("/src/sprites/catalog.ts"),
      G = await import("/src/sprites/geometry.ts");
    const variants = [
      [
        "north-warrior-female",
        "north_warrior",
        "female",
        "axe",
        "Nouvelle Guerrière du Nord",
      ],
      ["north-warrior", "north_warrior", "male", "axe", "Guerrier du Nord"],
      [
        "male-axe",
        "raider",
        "male",
        "axe_shield",
        "Pillard — hache et bouclier",
      ],
      [
        "male-sword",
        "raider",
        "male",
        "sword_shield",
        "Pillard — épée et bouclier",
      ],
      [
        "female-axe",
        "raider",
        "female",
        "axe_shield",
        "Pillarde validée — hache et bouclier",
      ],
      [
        "female-sword",
        "raider",
        "female",
        "sword_shield",
        "Pillarde — épée et bouclier",
      ],
      ["huntress", "hunter", "female", "bow", "Chasseuse"],
      ["hunter-male", "hunter", "male", "bow", "Nouveau Chasseur"],
      [
        "nordic-blade-female",
        "nordic_blade",
        "female",
        "sword",
        "Nouvelle Lame nordique féminine",
      ],
    ];
    variants.push([
      "nordic-blade-male",
      "nordic_blade",
      "male",
      "sword",
      "Lame nordique — nouveaux pas",
    ]);
    const results = [];
    for (const [id, cls, gender, weapon, title] of variants) {
      const unit = E.makeClassUnit(id, 1, 1, cls, title, 0, 0, gender);
      unit.activeWeaponId = weapon;
      E.syncWeapon(unit);
      const map = R.unitSpriteProfile(unit),
        profile = S.combatSkin(map).profile;
      const rows = [
        [
          [map, "idle", 0, "Attente carte 1"],
          [map, "idle", 1, "Attente carte 2"],
          [profile, "idle", 0, "Garde 1"],
          [profile, "idle", 1, "Garde 2"],
        ],
        Array.from({ length: 4 }, (_, i) => [
          profile,
          "move",
          i,
          `Pas rapide ${i + 1}`,
        ]),
        Array.from({ length: 4 }, (_, i) => [
          profile,
          "attack",
          i,
          `Attaque ${i + 1}`,
        ]),
        Array.from({ length: 4 }, (_, i) => [
          profile,
          "attack",
          i + 4,
          `Attaque ${i + 5}`,
        ]),
        Array.from({ length: 3 }, (_, i) => [
          profile,
          "block",
          i,
          `Défense ${i + 1}`,
        ]),
        Array.from({ length: 3 }, (_, i) => [
          profile,
          "evade",
          i,
          `Esquive ${i + 1}`,
        ]),
        [
          ...Array.from({ length: 3 }, (_, i) => [
            profile,
            "damage",
            i,
            `Dégâts ${i + 1}`,
          ]),
          [profile, "death", 0, "Mort"],
        ],
      ].filter((row) => row.every(([p, name]) => !!C.resolveClip(p, name)));
      for (const row of rows)
        for (let i = row.length - 1; i >= 0; i--)
          if (row[i][2] >= C.resolveClip(row[i][0], row[i][1]).frames.length)
            row.splice(i, 1);
      const poseCount = rows.reduce((n, row) => n + row.length, 0);
      for (const row of rows)
        for (const [p, name] of row)
          await R.spriteImage(C.resolveClip(p, name).source).decode();
      const canvas = document.createElement("canvas");
      const cellWidth = cls === "nordic_blade" ? 420 : 320;
      canvas.width = cellWidth * 4;
      canvas.height = 95 + rows.length * 295;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#18212a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ead5a5";
      ctx.font = "bold 28px Arial";
      ctx.fillText(title, 20, 35);
      ctx.fillStyle = "#d1dce6";
      ctx.font = "16px Arial";
      ctx.fillText(
        `Même échelle · ${poseCount} poses utilisées · riposte et seconde frappe = attaque · critique = effet partagé`,
        20,
        64,
      );
      for (let row = 0; row < rows.length; row++)
        for (let col = 0; col < rows[row].length; col++) {
          const [p, name, i, label] = rows[row][col],
            clip = C.resolveClip(p, name),
            rect = G.resourceRect(clip, i);
          const x = col * cellWidth,
            y = 85 + row * 295,
            reference =
              p.referenceHeights?.[clip.source] ??
              G.profileMetrics(p).references.get(clip.source);
          ctx.fillStyle = "#26333f";
          ctx.fillRect(x + 6, y + 3, cellWidth - 12, 287);
          ctx.strokeStyle = "#a5987866";
          ctx.beginPath();
          ctx.moveTo(x + 12, y + 258);
          ctx.lineTo(x + cellWidth - 12, y + 258);
          ctx.stroke();
          R.drawResourceFrame(
            ctx,
            p,
            name,
            i,
            x - (cls === "nordic_blade" ? 30 : 0),
            y + 258 - 280 * 0.96,
            cellWidth,
            280,
            true,
            "blue",
            "world",
            { scale: 185 / reference },
          );
          ctx.fillStyle = "#edf2f6";
          ctx.font = "16px Arial";
          ctx.fillText(label, x + 12, y + 282);
          if (!rect) throw Error(`${id} ${name} ${i}: missing geometry`);
        }
      results.push({ id, title, image: canvas.toDataURL("image/png") });
    }
    return results;
  });
  for (const row of result)
    await writeFile(
      `${out}/${row.id}.png`,
      Buffer.from(row.image.split(",")[1], "base64"),
    );
  await writeFile(
    `${out}/index.html`,
    `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Animations nordiques harmonisées</title><style>body{margin:24px;background:#18212a;color:#eef2f6;font:17px Arial}a{color:#ead5a5}img{max-width:100%;height:auto;image-rendering:pixelated}section{margin-bottom:40px}</style><h1>Les variantes nordiques intégrées</h1><p><a href="../index.html">Comparaison des classes et terrain avant/après</a></p><p>Les poses sont celles du moteur. Pour les voir animées avec vitesse réglable, ouvrir l’essai de combat depuis l’accueil.</p>${result.map((r) => `<section><h2>${r.title}</h2><a href="${r.id}.png"><img loading="lazy" src="${r.id}.png" alt="Poses utilisées de ${r.title}"></a></section>`).join("")}</html>`,
  );
  console.log(
    `Exported ${result.length} animation boards, no parry for unshielded units.`,
  );
} finally {
  await browser.close();
}
