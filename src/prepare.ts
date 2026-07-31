import fs from "node:fs";
import path from "node:path";
import * as semver from "semver";
import type { ReleaseType } from "semver";
import { getReleaseTag } from "./detectRelease.ts";
import { validatePublishVersion } from "./publish.ts";
import type { prepareRelease as prepareReleaseDef } from "./types.d.ts";
import { updateVersion } from "./utils.ts";

function resolveVersion(currentVersion: string, release: string, preid: string): string {
  if (semver.valid(release)) return release;

  const releaseType =
    release === "next" ? (semver.prerelease(currentVersion) ? "prerelease" : "patch") : release;
  if (!semver.RELEASE_TYPES.includes(releaseType as ReleaseType)) {
    throw new Error(`Invalid Version: ${release}`);
  }

  let version = semver.inc(currentVersion, releaseType as ReleaseType, preid);
  if (!version) throw new Error(`Invalid Version: ${release}`);

  const prerelease = semver.prerelease(version);
  if (releaseType.startsWith("pre") && prerelease?.[0] === preid && prerelease[1] === 0) {
    version = semver.inc(version, "prerelease", preid)!;
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
  if (semver.valid(release)) validatePublishVersion(release);
  const packageJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
    version?: unknown;
  };
  if (typeof packageJson.version !== "string") {
    throw new Error(`Package ${JSON.stringify(pkg)} does not have a valid version`);
  }
  const currentPrerelease = semver.prerelease(packageJson.version);
  const currentPreid =
    typeof currentPrerelease?.[0] === "string" ? currentPrerelease[0] : undefined;

  const previousVersion = packageJson.version;
  const version = resolveVersion(previousVersion, release, preid ?? currentPreid ?? "beta");
  validatePublishVersion(version);
  updateVersion(pkgPath, version);

  await generateChangelog?.(pkg, version);

  return { pkg, previousVersion, version, tag: toTag(pkg, version) };
};
