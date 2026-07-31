import * as semver from "semver";
import { args, getActiveVersion, getPackageInfo, publishPackage, step } from "./utils.ts";
import type {
  getPublishTag as getPublishTagDef,
  publish as publishDef,
  validatePublishVersion as validatePublishVersionDef,
} from "./types.d.ts";

export const validatePublishVersion: typeof validatePublishVersionDef = (version) => {
  const parsed = semver.parse(version);
  if (!parsed) {
    throw new Error(`Invalid publish version ${JSON.stringify(version)}`);
  }

  const prereleaseIdentifier = parsed.prerelease[0];
  if (
    prereleaseIdentifier !== undefined &&
    prereleaseIdentifier !== "alpha" &&
    prereleaseIdentifier !== "beta"
  ) {
    throw new Error(`Only alpha and beta prereleases are supported, received ${version}`);
  }
};

export const getPublishTag: typeof getPublishTagDef = (version, activeVersion) => {
  validatePublishVersion(version);
  const prereleaseIdentifier = semver.prerelease(version)?.[0];
  if (prereleaseIdentifier === "alpha" || prereleaseIdentifier === "beta") {
    return prereleaseIdentifier;
  }
  return activeVersion && semver.lt(version, activeVersion) ? "previous" : undefined;
};

export const publish: typeof publishDef = async ({
  defaultPackage,
  getPkgDir,
  provenance,
  packageManager,
}) => {
  const tag = args._[0];
  if (!tag) throw new Error("No tag specified");

  let pkgName = defaultPackage;
  let version;

  if (tag.includes("@")) [pkgName, version] = tag.split("@");
  else version = tag;

  if (version.startsWith("v")) version = version.slice(1);

  if (pkgName === undefined)
    throw new Error(
      `Package name should be specified in tag "${tag}" when defaultPackage is not set`,
    );

  const { pkg, pkgDir } = getPackageInfo(pkgName, getPkgDir);
  if (pkg.version !== version)
    throw new Error(
      `Package version from tag "${version}" mismatches with current version "${pkg.version}"`,
    );
  validatePublishVersion(version);

  const activeVersion = await getActiveVersion(pkg.name);

  step("Publishing package...");
  const releaseTag = getPublishTag(version, activeVersion);
  await publishPackage(pkgDir, releaseTag, provenance, packageManager);
};
