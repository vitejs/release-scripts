import { execSync } from "child_process";
import { release } from "../src/release.ts";

release({
  repo: "release-scripts",
  packages: ["release-scripts"],
  toTag: (_, version) => `v${version}`,
  logChangelog: () =>
    console.log(
      execSync(
        "git log $(git describe --tags --abbrev=0)..HEAD --oneline",
      ).toString(),
    ),
  generateChangelog: () => {},
  getPkgDir: () => ".",
});
