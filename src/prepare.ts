import fs from "node:fs";
import path from "node:path";
import type { IncrementType } from "verkit";
import { getPrerelease, increment, INCREMENT_TYPES, isValid } from "verkit";
import { getReleaseTag } from "./detectRelease.ts";
import { validatePublishVersion } from "./publish.ts";
import type { prepareRelease as prepareReleaseDef } from "./types.d.ts";
import { updateVersion } from "./utils.ts";

function resolveVersion(currentVersion: string, release: string, preid: string): string {
  if (isValid(release)) return release;

  const releaseType =
    release === "next" ? (getPrerelease(currentVersion)?.length ? "prerelease" : "patch") : release;
  if (releaseType === "release" || !INCREMENT_TYPES.includes(releaseType as IncrementType)) {
    throw new Error(`Invalid Version: ${release}`);
  }

  let version = increment(currentVersion, releaseType as IncrementType, { identifier: preid });
  if (!version) throw new Error(`Invalid Version: ${release}`);

  const prerelease = getPrerelease(version);
  if (releaseType.startsWith("pre") && prerelease?.[0] === preid && prerelease[1] === 0) {
    version = increment(version, "prerelease", { identifier: preid })!;
  }
  return version;
}

export const prepareRelease: typeof prepareReleaseDef = async ({
  packages,
  pkg,
  release,
  preid,
  getPkgDir = (pkgName) => `packages/${pkgName}`,
  toTag = (pkgName, version) => getReleaseTag(pkgName, version),
  generateChangelog,
}) => {
  if (!pkg || (packages && !packages.includes(pkg))) {
    const expected = packages?.length ? ` Expected one of: ${packages.join(", ")}` : "";
    throw new Error(`Invalid release package ${JSON.stringify(pkg)}.${expected}`);
  }

  const pkgDir = path.resolve(getPkgDir(pkg));
  const pkgPath = path.join(pkgDir, "package.json");
  if (isValid(release)) validatePublishVersion(release);
  const packageJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
    version?: unknown;
  };
  if (typeof packageJson.version !== "string") {
    throw new Error(`Package ${JSON.stringify(pkg)} does not have a valid version`);
  }
  const currentPrerelease = getPrerelease(packageJson.version);
  const currentPreid =
    typeof currentPrerelease?.[0] === "string" ? currentPrerelease[0] : undefined;

  const previousVersion = packageJson.version;
  const version = resolveVersion(previousVersion, release, preid ?? currentPreid ?? "beta");
  validatePublishVersion(version);
  updateVersion(pkgPath, version);

  await generateChangelog?.(pkg, version);

  return { pkg, previousVersion, version, tag: toTag(pkg, version) };
};
