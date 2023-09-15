import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import colors from "picocolors";
import type { Options as ExecaOptions, ExecaReturnValue } from "execa";
import { execa } from "execa";
import type { ReleaseType } from "semver";
import semver from "semver";
import mri from "mri";

export const args = mri(process.argv.slice(2));

export const isDryRun = !!args.dry;

if (isDryRun) {
  console.log(colors.inverse(colors.yellow(" DRY RUN ")));
  console.log();
}

export function getPackageInfo(
  pkgName: string,
  getPkgDir: ((pkg: string) => string) | undefined = (pkg) => `packages/${pkg}`,
) {
  const pkgDir = path.resolve(getPkgDir(pkgName));
  const pkgPath = path.resolve(pkgDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
    name: string;
    version: string;
    private?: boolean;
  };

  if (pkg.private) {
    throw new Error(`Package ${pkgName} is private`);
  }

  return { pkg, pkgDir, pkgPath };
}

export async function run(
  bin: string,
  args: string[],
  opts: ExecaOptions = {},
): Promise<ExecaReturnValue> {
  return execa(bin, args, { stdio: "inherit", ...opts });
}

export async function dryRun(
  bin: string,
  args: string[],
  opts?: ExecaOptions,
): Promise<void> {
  return console.log(
    colors.blue(`[dryrun] ${bin} ${args.join(" ")}`),
    opts || "",
  );
}

export const runIfNotDry = isDryRun ? dryRun : run;

export function step(msg: string): void {
  return console.log(colors.cyan(msg));
}

interface VersionChoice {
  title: string;
  value: string;
}
export function getVersionChoices(currentVersion: string): VersionChoice[] {
  const currentBeta = currentVersion.includes("beta");
  const currentAlpha = currentVersion.includes("alpha");
  const isStable = !currentBeta && !currentAlpha;

  function inc(i: ReleaseType, tag = currentAlpha ? "alpha" : "beta") {
    return semver.inc(currentVersion, i, tag)!;
  }

  let versionChoices: VersionChoice[] = [
    {
      title: "next",
      value: inc(isStable ? "patch" : "prerelease"),
    },
  ];

  if (isStable) {
    versionChoices.push(
      {
        title: "beta-minor",
        value: inc("preminor"),
      },
      {
        title: "beta-major",
        value: inc("premajor"),
      },
      {
        title: "alpha-minor",
        value: inc("preminor", "alpha"),
      },
      {
        title: "alpha-major",
        value: inc("premajor", "alpha"),
      },
      {
        title: "minor",
        value: inc("minor"),
      },
      {
        title: "major",
        value: inc("major"),
      },
    );
  } else if (currentAlpha) {
    versionChoices.push({
      title: "beta",
      value: inc("patch") + "-beta.0",
    });
  } else {
    versionChoices.push({
      title: "stable",
      value: inc("patch"),
    });
  }
  versionChoices.push({ value: "custom", title: "custom" });

  versionChoices = versionChoices.map((i) => {
    i.title = `${i.title} (${i.value})`;
    return i;
  });

  return versionChoices;
}

export function updateVersion(pkgPath: string, version: string): void {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

export async function publishPackage(
  pkgDir: string,
  tag?: string,
  provenance?: boolean,
  packageManager: "npm" | "pnpm" = "npm",
): Promise<void> {
  const publicArgs = ["publish", "--access", "public"];
  if (tag) {
    publicArgs.push(`--tag`, tag);
  }
  if (provenance) {
    publicArgs.push(`--provenance`);
  }
  if (packageManager === "pnpm") {
    publicArgs.push(`--no-git-checks`);
  }
  await runIfNotDry(packageManager, publicArgs, {
    cwd: pkgDir,
  });
}

export async function getActiveVersion(
  npmName: string,
): Promise<string | undefined> {
  try {
    return (await run("npm", ["info", npmName, "version"], { stdio: "pipe" }))
      .stdout;
  } catch (e: any) {
    // Not published yet
    if (e.stderr.startsWith("npm ERR! code E404")) return;
    throw e;
  }
}
