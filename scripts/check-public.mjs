import { readdir, readFile } from "node:fs/promises";
const prototype = process.argv.includes("--prototype");
const directory =
  process.argv.find((a) => a.startsWith("--dir="))?.slice(6) ?? "dist";
let hasGallery = false;
const files = await readdir(directory + "/assets");
for (const file of files.filter((f) => /\.(js|css)$/.test(f))) {
  const text = await readFile(directory + "/assets/" + file, "utf8");
  for (const forbidden of [
    "Galerie des sprites",
    "Atelier de test",
    "Essai des combats",
    "VALIDATION VISUELLE",
    "ATELIER INDÉPENDANT",
    "Classes et systèmes",
    "lte-sprite-reviews-v1",
    "sprite-gallery",
  ])
    if (text.includes(forbidden)) {
      hasGallery = true;
      if (prototype) continue;
      throw Error(
        `Outil de développement présent dans la version publique : ${file} / ${forbidden}`,
      );
    }
}
if (prototype && !hasGallery)
  throw Error("Galerie absente du prototype de test");
console.log(
  prototype
    ? "Prototype : outils de développement accessibles."
    : "Version publique : aucun écran ni stockage de galerie / inspection développeur.",
);
