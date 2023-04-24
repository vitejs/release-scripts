export declare function publish(options: {
  defaultPackage: string;
  getPkgDir?: (pkg: string) => string;
  /**
   * Enables npm package provenance https://docs.npmjs.com/generating-provenance-statements
   * @default false
   */
  provenance?: boolean;
}): Promise<void>;

export declare function release(options: {
  repo: string;
  packages: string[];
  logChangelog: (pkg: string) => void | Promise<void>;
  generateChangelog: (pkg: string, version: string) => void | Promise<void>;
  toTag: (pkg: string, version: string) => string;
  getPkgDir?: (pkg: string) => string;
}): Promise<void>;
