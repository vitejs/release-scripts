# @vitejs/release-scripts

This repo is used to share release & publish scripts for the org. Scripts should be executed from the workspace root via `tsx scripts/release.ts`

## release

```ts
import { release } from "@vitejs/release-scripts";

release({
  // Name of the repo for CI link
  repo: "release-scripts",
  // List of options. Choise will be used in following callback
  packages: ["release-scripts"],
  toTag: (pkg, version) =>
    pkg === "vite" ? `v${version}` : `${pkg}@${version}`,
  // Not shared until we find a new changelog process
  logChangelog: () =>
    console.log(
      execSync(
        "git log $(git describe --tags --abbrev=0)..HEAD --oneline",
      ).toString(),
    ),
  generateChangelog: () => {},
  // use getPkgDir when not using a monorepo. Default to `packages/${pkg}`
  getPkgDir: () => ".",
});
```

## publish

```ts
import { publish } from "@vitejs/release-scripts";

publish({
  // Used when tag is not `pkg@version`
  defaultPackage: "release-scripts",
  // use getPkgDir when not in a monorepo. Default to `packages/${pkg}`
  getPkgDir: () => ".",
});
```
