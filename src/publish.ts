import semver from "semver";
import {
  args,
  getActiveVersion,
  getPackageInfo,
  publishPackage,
  step,
} from "./utils.ts";
import type { publish as def } from "./types.d.ts";

export const publish: typeof def = async ({
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

  const activeVersion = await getActiveVersion(pkg.name);

  step("Publishing package...");
  const releaseTag = version.includes("beta")
    ? "beta"
    : version.includes("alpha")
      ? "alpha"
      : activeVersion && semver.lt(pkg.version, activeVersion)
        ? "previous"
        : undefined;
  await publishPackage(pkgDir, releaseTag, provenance, packageManager);
};
