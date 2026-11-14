import { test, expect } from "@playwright/test";

test("Le Plan : édition, persistance, annulation, JSON et isolation de campagne", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("lte-save", "campaign-sentinel"),
  );
  await page.getByRole("button", { name: "Le Plan", exact: true }).click();
  const nav = page.getByRole("navigation", { name: "Chapitres du Plan" });
  await expect(nav.getByRole("button")).toHaveCount(15);
  await expect(
    page.getByLabel("Avant le combat", { exact: true }),
  ).toContainText("Odrine");
  await page
    .getByLabel("Nom du chapitre", { exact: true })
    .fill("<b>Un nouveau titre</b>");
  await page
    .getByLabel("Avant le combat", { exact: true })
    .fill("Une scène modifiée.");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Le Plan", exact: true }).click();
  await expect(page.getByLabel("Nom du chapitre", { exact: true })).toHaveValue(
    "<b>Un nouveau titre</b>",
  );
  await expect(nav.locator("b")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Notes générales", exact: true })
    .click();
  await page
    .getByLabel("Notes générales", { exact: true })
    .fill("Notes sauvegardées");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page
    .getByLabel("Notes générales", { exact: true })
    .fill("Notes à annuler");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", {
      name: "Annuler les modifications non enregistrées",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Notes générales", { exact: true })).toHaveValue(
    "Notes sauvegardées",
  );
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Exporter le plan complet en JSON",
      exact: true,
    })
    .click();
  const download = await downloadEvent;
  const file = await download.path();
  const { readFile } = await import("node:fs/promises");
  const exported = JSON.parse(await readFile(file!, "utf8"));
  expect(exported.version).toBe(1);
  expect(exported.chapters).toHaveLength(14);
  expect(exported.notes).toBe("Notes sauvegardées");
  expect(
    exported.chapters.find((c: { id: string }) => c.id === "10.5").optional,
  ).toBe(true);
  await page
    .locator("#plan-import")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":99}'),
    });
  await expect(page.getByRole("status")).toContainText("Import refusé");
  await expect(page.getByLabel("Notes générales", { exact: true })).toHaveValue(
    "Notes sauvegardées",
  );
  const invalidOptional = structuredClone(exported);
  invalidOptional.chapters.find(
    (c: { id: string }) => c.id === "10.5",
  ).optional = false;
  await page
    .locator("#plan-import")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(invalidOptional)),
    });
  await expect(page.getByRole("status")).toContainText("Import refusé");
  exported.notes = "Notes importées";
  page.once("dialog", (d) => d.accept());
  await page
    .locator("#plan-import")
    .setInputFiles({
      name: "plan.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(exported)),
    });
  await expect(page.getByRole("status")).toContainText("importé et enregistré");
  await expect(page.getByLabel("Notes générales", { exact: true })).toHaveValue(
    "Notes importées",
  );
  await nav.getByRole("button").first().click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Réinitialiser ce chapitre", exact: true })
    .click();
  await expect(page.getByLabel("Nom du chapitre", { exact: true })).toHaveValue(
    "Les Terres Égarées",
  );
  await expect(
    page.getByLabel("Avant le combat", { exact: true }),
  ).toContainText("Odrine");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem("lte-save"))).toBe(
    "campaign-sentinel",
  );
  await page
    .getByRole("button", { name: "Retour au menu principal", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Nouvelle aventure/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("Le Plan : téléphone, navigation et modifications non enregistrées", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Le Plan", exact: true }).click();
  const nav = page.getByRole("navigation", { name: "Chapitres du Plan" });
  await nav.getByRole("button", { name: /Chapitre 10.5/ }).click();
  await expect(page.getByRole("heading", { level: 2 })).toContainText(
    "(facultatif)",
  );
  await page
    .getByLabel("Pendant le combat", { exact: true })
    .fill("Texte provisoire");
  await nav.getByRole("button", { name: /Chapitre 12/ }).click();
  await nav.getByRole("button", { name: /Chapitre 10.5/ }).click();
  await expect(
    page.getByLabel("Pendant le combat", { exact: true }),
  ).toHaveValue("Texte provisoire");
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Retour au menu principal", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Le Plan", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Enregistrer", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Enregistrer", exact: true }),
  ).toBeInViewport();
});
