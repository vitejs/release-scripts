import fs from "node:fs";
import path from "node:path";
import type {
  detectReleaseCommit as detectReleaseCommitDef,
  getReleaseTag as getReleaseTagDef,
  isReleaseCommitSubject as isReleaseCommitSubjectDef,
} from "./types.d.ts";

export const getReleaseTag: typeof getReleaseTagDef = (pkg, version, defaultPackage) => {
  return pkg === defaultPackage ? `v${version}` : `${pkg}@${version}`;
};

export const isReleaseCommitSubject: typeof isReleaseCommitSubjectDef = (subject, tag) => {
  const expected = `release: ${tag}`;
  return (
    subject === expected ||
    (subject.startsWith(expected) && /^ \(#\d+\)$/.test(subject.slice(expected.length)))
  );
};

export const detectReleaseCommit: typeof detectReleaseCommitDef = ({
  subject,
  packages,
  defaultPackage,
  getPkgDir = (pkg) => `packages/${pkg}`,
  toTag = (pkg, version) => getReleaseTag(pkg, version, defaultPackage),
}) => {
  for (const pkg of packages) {
    const pkgPath = path.resolve(getPkgDir(pkg), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
      version?: unknown;
    };
    if (typeof packageJson.version !== "string") {
      throw new Error(`Package ${JSON.stringify(pkg)} does not have a valid version`);
    }

    const version = packageJson.version;
    const tag = toTag(pkg, version);
    if (isReleaseCommitSubject(subject, tag)) return { pkg, version, tag };
  }
  return undefined;
};
