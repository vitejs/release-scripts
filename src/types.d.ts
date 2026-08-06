export declare function generateChangelog(options: {
  /** @example () => `packages/${pkgName}` */
  getPkgDir: () => string;
  /** @example `${pkgName}@` */
  tagPrefix?: string;
}): Promise<void>;

export declare function extractChangelogEntry(options: {
  changelogPath: string;
  version: string;
}): string;

export declare function getReleaseTag(
  pkg: string,
  version: string,
  defaultPackage?: string,
): string;

export declare function isReleaseCommitSubject(subject: string, tag: string): boolean;

export declare function detectReleaseCommit(options: {
  subject: string;
  packages: readonly string[];
  defaultPackage?: string;
  /** @default (pkg) => `packages/${pkg}` */
  getPkgDir?: (pkg: string) => string;
  toTag?: (pkg: string, version: string) => string;
}): { pkg: string; version: string; tag: string } | undefined;

export declare function prepareRelease(options: {
  /** Restricts the accepted package names when provided. */
  packages?: readonly string[];
  pkg: string | undefined;
  release: string;
  /** @default current prerelease identifier, otherwise "beta" */
  preid?: string;
  /** @default (pkg) => `packages/${pkg}` */
  getPkgDir?: (pkg: string) => string;
  /** @default (pkg, version) => `${pkg}@${version}` */
  toTag?: (pkg: string, version: string) => string;
  generateChangelog?: (pkg: string, version: string) => void | Promise<void>;
}): Promise<{ pkg: string; previousVersion: string; version: string; tag: string }>;

export declare function validatePublishVersion(version: string): void;

export declare function getPublishTag(version: string, activeVersion?: string): string | undefined;

export declare function publish(options: {
  defaultPackage?: string;
  getPkgDir?: (pkg: string) => string;
  /**
   * Enables npm package provenance https://docs.npmjs.com/generating-provenance-statements
   * @default false
   */
  provenance?: boolean;
  /**
   * Package manager that runs the publish command
   * @default "npm"
   */
  packageManager?: "npm" | "pnpm";
}): Promise<void>;

export declare function release(options: {
  /** @default 'vitejs' */
  org?: string;
  repo: string;
  packages: string[];
  logChangelog: (pkg: string) => void | Promise<void>;
  generateChangelog: (pkg: string, version: string) => void | Promise<void>;
  toTag: (pkg: string, version: string) => string;
  getPkgDir?: (pkg: string) => string;
}): Promise<void>;
