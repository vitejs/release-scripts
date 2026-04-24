import { defineConfig } from "rolldown";
import pkg from "./package.json" with { type: "json" };
import { copyFileSync } from "node:fs";

export default defineConfig({
  input: ["src/index.ts"],
  platform: "node",
  output: {
    dir: "dist",
    cleanDir: true,
  },
  external: Object.keys(pkg.dependencies).map(
    (name) => new RegExp(`^${name}(?:$|/)`),
  ),
  plugins: [
    {
      name: "copy-types",
      writeBundle() {
        copyFileSync("src/types.d.ts", "dist/index.d.ts");
      },
    },
  ],
});
