import { readdir, readFile } from "node:fs/promises";
const files = await readdir("dist/assets");
for (const file of files.filter((f) => /\.(js|css)$/.test(f))) {
  const text = await readFile("dist/assets/" + file, "utf8");
  for (const forbidden of [
    "Galerie des sprites",
    "Classes et systèmes",
    "lte-sprite-reviews-v1",
    "sprite-gallery",
  ])
    if (text.includes(forbidden))
      throw Error(
        `Outil de développement présent dans la version publique : ${file} / ${forbidden}`,
      );
}
console.log(
  "Version publique : aucun écran ni stockage de galerie / inspection développeur.",
);
