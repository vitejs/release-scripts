import { publish } from "../src";

publish({
  defaultPackage: "release-scripts",
  getPkgDir: () => ".",
});
