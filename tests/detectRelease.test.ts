import path from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";
import { createFixture } from "fs-fixture";
import {
  detectReleaseCommit,
  getReleaseTag,
  isReleaseCommitSubject,
} from "../src/detectRelease.ts";

it("constructs package and default-package release tags", () => {
  expect(getReleaseTag("plugin-react", "1.2.3")).toBe("plugin-react@1.2.3");
  expect(getReleaseTag("vite", "1.2.3", "vite")).toBe("v1.2.3");
});

describe("isReleaseCommitSubject", () => {
  for (const [subject, expected] of [
    ["release: vite@1.2.3", true],
    ["release: vite@1.2.3 (#123)", true],
    ["release: vite@1.2.3 arbitrary", false],
    ["chore: release vite@1.2.3", false],
  ] as const) {
    it(`matches release commit subject ${subject}`, () => {
      expect(isReleaseCommitSubject(subject, "vite@1.2.3")).toBe(expected);
    });
  }
});

describe("detectReleaseCommit", () => {
  async function createPackages(versions: Record<string, string>) {
    const fixture = await createFixture({
      packages: Object.fromEntries(
        Object.entries(versions).map(([pkg, version]) => [
          pkg,
          { "package.json": JSON.stringify({ name: pkg, version }) },
        ]),
      ),
    });
    onTestFinished(() => fixture.rm());
    return fixture;
  }

  it("detects a package release from its manifest and commit subject", async () => {
    const fixture = await createPackages({
      "plugin-react": "1.2.3",
      "plugin-rsc": "0.5.0",
    });

    expect(
      detectReleaseCommit({
        subject: "release: plugin-rsc@0.5.0 (#42)",
        packages: ["plugin-react", "plugin-rsc"],
        getPkgDir: (pkg) => path.join(fixture.path, "packages", pkg),
      }),
    ).toStrictEqual({ pkg: "plugin-rsc", version: "0.5.0", tag: "plugin-rsc@0.5.0" });
  });

  it("supports a default package with v-prefixed tags", async () => {
    const fixture = await createPackages({ vite: "8.0.0", "create-vite": "8.0.0" });

    expect(
      detectReleaseCommit({
        subject: "release: v8.0.0",
        packages: ["vite", "create-vite"],
        defaultPackage: "vite",
        getPkgDir: (pkg) => path.join(fixture.path, "packages", pkg),
      }),
    ).toStrictEqual({ pkg: "vite", version: "8.0.0", tag: "v8.0.0" });
  });

  it("returns undefined when the subject does not identify a release", async () => {
    const fixture = await createPackages({ vite: "8.0.0" });

    expect(
      detectReleaseCommit({
        subject: "fix: something else",
        packages: ["vite"],
        defaultPackage: "vite",
        getPkgDir: (pkg) => path.join(fixture.path, "packages", pkg),
      }),
    ).toBeUndefined();
  });
});
