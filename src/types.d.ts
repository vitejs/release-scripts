export declare function publish(options: {
  defaultPackage: string;
  getPkgDir?: (pkg: string) => string;
}): Promise<void>;

export declare function release(options: {
  repo: string;
  packages: string[];
  logChangelog: (pkg: string) => void | Promise<void>;
  generateChangelog: (pkg: string) => void | Promise<void>;
  toTag: (pkg: string, version: string) => string;
  getPkgDir?: (pkg: string) => string;
}): Promise<void>;
