# @vitejs/release-scripts

This repo is used to share release & publish scripts for the org. Scripts should be executed from the workspace root via `tsx scripts/release.ts`

## release

```ts
import { release } from "@vitejs/release-scripts";

release({
  // Name of the repo for CI link
  repo: "release-scripts",
  // List of options. Choice will be available in following callback as `pkg`
  packages: ["release-scripts"],
  toTag: (pkg, version) =>
    pkg === "vite" ? `v${version}` : `${pkg}@${version}`,
  // Not shared until we find a new changelog process
  logChangelog: (pkg) =>
    console.log(
      execSync(
        "git log $(git describe --tags --abbrev=0)..HEAD --oneline",
      ).toString(),
    ),
  generateChangelog: (pkg, version) => {},
  // Use getPkgDir when not using a monorepo. Default to `packages/${pkg}`
  getPkgDir: (pkg) => ".",
});
```

## publish

```ts
import { publish } from "@vitejs/release-scripts";

publish({
  // Used when tag is not `pkg@version`
  defaultPackage: "release-scripts",
  // Use getPkgDir when not in a monorepo. Default to `packages/${pkg}`
  getPkgDir: (pkg) => ".",
  // Publish with provenance https://docs.npmjs.com/generating-provenance-statements
  provenance: true,
  // Package manager that runs the publish command
  packageManager: "pnpm",
});
```
