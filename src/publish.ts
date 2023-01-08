import semver from "semver";
import {
  args,
  getActiveVersion,
  getPackageInfo,
  publishPackage,
  step,
} from "./utils";
import type { publish as def } from "./types";

export const publish: typeof def = async ({ defaultPackage, getPkgDir }) => {
  const tag = args._[0];
  if (!tag) throw new Error("No tag specified");

  let pkgName = defaultPackage;
  let version;

  if (tag.includes("@")) [pkgName, version] = tag.split("@");
  else version = tag;

  if (version.startsWith("v")) version = version.slice(1);

  const { currentVersion, pkgDir } = getPackageInfo(pkgName, getPkgDir);
  if (currentVersion !== version)
    throw new Error(
      `Package version from tag "${version}" mismatches with current version "${currentVersion}"`,
    );

  const activeVersion = await getActiveVersion(pkgName);

  step("Publishing package...");
  const releaseTag = version.includes("beta")
    ? "beta"
    : version.includes("alpha")
    ? "alpha"
    : semver.lt(currentVersion, activeVersion)
    ? "previous"
    : undefined;
  await publishPackage(pkgDir, releaseTag);
};
