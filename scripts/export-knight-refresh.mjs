import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const out = "public/validation/chevaliers/animations";
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
      ["man-arms-male", "man_at_arms", "male", "sword_shield", "Homme d’armes"],
      [
        "man-arms-female",
        "man_at_arms",
        "female",
        "sword_shield",
        "Femme d’armes",
      ],
      ["swordsman-male", "swordsman", "male", "sword", "Épéiste homme"],
      ["swordsman-female", "swordsman", "female", "sword", "Épéiste femme"],
      ["crossbow-female", "crossbowman", "female", "crossbow", "Arbalétrière"],
      ["sorceress", "sorcerer", "female", "spell", "Sorcière"],
      ["sorcerer-male", "sorcerer", "male", "spell", "Sorcier"],
      [
        "spearman",
        "spearman",
        "male",
        "lance",
        "Lanciers — estoc partagé homme/femme",
      ],
    ];
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
      for (const action of ["reload", "heal"]) {
        const c = C.resolveClip(profile, action);
        if (c)
          rows.push(
            Array.from({ length: c.frames.length }, (_, i) => [
              profile,
              action,
              i,
              `${action === "heal" ? "Soins" : "Rechargement"} ${i + 1}`,
            ]),
          );
      }
      // Only real frames: a seven-pose attack or a single idle isn't duplicated.
      for (const row of rows)
        for (let i = row.length - 1; i >= 0; i--)
          if (row[i][2] >= C.resolveClip(row[i][0], row[i][1]).frames.length)
            row.splice(i, 1);
      const poseCount = rows.reduce((n, row) => n + row.length, 0);
      for (const row of rows)
        for (const [p, name] of row)
          await R.spriteImage(C.resolveClip(p, name).source).decode();
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
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
          const x = col * 320,
            y = 85 + row * 295,
            reference =
              p.referenceHeights?.[clip.source] ??
              G.profileMetrics(p).references.get(clip.source);
          ctx.fillStyle = "#26333f";
          ctx.fillRect(x + 6, y + 3, 308, 287);
          ctx.strokeStyle = "#a5987866";
          ctx.beginPath();
          ctx.moveTo(x + 12, y + 258);
          ctx.lineTo(x + 308, y + 258);
          ctx.stroke();
          R.drawResourceFrame(
            ctx,
            p,
            name,
            i,
            x,
            y + 258 - 280 * 0.96,
            320,
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
    `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Animations des nouveaux Chevaliers</title><style>body{margin:24px;background:#18212a;color:#eef2f6;font:17px Arial}a{color:#ead5a5}img{max-width:100%;height:auto;image-rendering:pixelated}section{margin-bottom:40px}</style><h1>Animations des Chevaliers — versions actuelles</h1><p><a href="../index.html">Comparaison des classes et terrain avant/après</a></p><p>Les poses sont celles du moteur. Pour les voir animées avec vitesse réglable, ouvrir l’essai de combat depuis l’accueil.</p>${result.map((r) => `<section><h2>${r.title}</h2><a href="${r.id}.png"><img loading="lazy" src="${r.id}.png" alt="Poses utilisées de ${r.title}"></a></section>`).join("")}</html>`,
  );
  console.log(
    `Exported ${result.length} animation boards, no parry for unshielded units.`,
  );
} finally {
  await browser.close();
}
