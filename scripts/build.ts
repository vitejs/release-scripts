import { copyFileSync, rmSync } from "node:fs";
import { buildSync } from "esbuild";
import { dependencies } from "../package.json";

rmSync("dist", { force: true, recursive: true });

buildSync({
  entryPoints: ["src/index.ts"],
  outdir: "dist",
  bundle: true,
  platform: "node",
  format: "esm",
  external: Object.keys(dependencies),
});

copyFileSync("src/types.d.ts", "dist/index.d.ts");
