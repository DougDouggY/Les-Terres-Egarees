import { build } from "esbuild";
await build({
  entryPoints: ["src/ui/staff-cast.ts"],
  outfile: "public/validation/vikings-evolues/reprises/staff-cast.js",
  format: "esm",
  bundle: true,
  minify: false,
  banner: {
    js: "/* Generated from src/ui/staff-cast.ts; shared with campaign spell rendering. */",
  },
});
