import fs from "node:fs/promises";
import path from "node:path";
import { expect, it, onTestFinished } from "vitest";
import { createFixture } from "fs-fixture";
import { prepareRelease } from "../src/prepare.ts";

async function createPackage(version: string, isPrivate = false) {
  const fixture = await createFixture({
    packages: {
      example: {
        "package.json": JSON.stringify({
          name: "@vitejs/example",
          version,
          private: isPrivate,
        }),
      },
    },
  });
  onTestFinished(() => fixture.rm());
  return fixture;
}

async function readVersion(root: string): Promise<string> {
  const packageJson = JSON.parse(
    await fs.readFile(path.join(root, "packages/example/package.json"), "utf8"),
  );
  return packageJson.version;
}

it("prepares an exact version and invokes the changelog callback", async () => {
  const fixture = await createPackage("1.2.3", true);
  const calls: [string, string][] = [];

  const result = await prepareRelease({
    pkg: "example",
    release: "2.0.0",
    getPkgDir: (pkg) => path.join(fixture.path, "packages", pkg),
    generateChangelog: (pkg, version) => {
      calls.push([pkg, version]);
    },
  });

  expect(result).toEqual({
    pkg: "example",
    previousVersion: "1.2.3",
    tag: "example@2.0.0",
    version: "2.0.0",
  });
  expect(await readVersion(fixture.path)).toBe("2.0.0");
  expect(calls).toEqual([["example", "2.0.0"]]);
});

it("returns a custom release tag", async () => {
  const fixture = await createPackage("1.2.3");

  const result = await prepareRelease({
    pkg: "example",
    release: "2.0.0",
    getPkgDir: (pkg) => path.join(fixture.path, "packages", pkg),
    toTag: (_pkg, version) => `v${version}`,
  });

  expect(result.tag).toBe("v2.0.0");
});

it("resolves next to a patch for a stable version", async () => {
  const fixture = await createPackage("1.2.3");

  const result = await prepareRelease({
    pkg: "example",
    release: "next",
    getPkgDir: (pkg) => path.join(fixture.path, "packages", pkg),
  });

  expect(result.version).toBe("1.2.4");
});

it("preserves the identifier when advancing an existing prerelease", async () => {
  const fixture = await createPackage("1.2.3-alpha.1");

  const result = await prepareRelease({
    pkg: "example",
    release: "next",
    getPkgDir: (pkg) => path.join(fixture.path, "packages", pkg),
  });

  expect(result.version).toBe("1.2.3-alpha.2");
});

it("uses beta.1 for a new prerelease by default", async () => {
  const fixture = await createPackage("1.2.3");

  const result = await prepareRelease({
    pkg: "example",
    release: "preminor",
    getPkgDir: (pkg) => path.join(fixture.path, "packages", pkg),
  });

  expect(result.version).toBe("1.3.0-beta.1");
});

it("rejects an invalid release without modifying package.json", async () => {
  const fixture = await createPackage("1.2.3");

  await expect(
    prepareRelease({
      pkg: "example",
      release: "banana",
      getPkgDir: (pkg) => path.join(fixture.path, "packages", pkg),
    }),
  ).rejects.toThrow("Invalid Version: banana");
  expect(await readVersion(fixture.path)).toBe("1.2.3");
});

for (const pkg of [undefined, "other"]) {
  it(`rejects invalid package ${JSON.stringify(pkg)}`, async () => {
    await expect(
      prepareRelease({
        packages: ["example"],
        pkg,
        release: "patch",
      }),
    ).rejects.toThrow(`Invalid release package ${JSON.stringify(pkg)}. Expected one of: example`);
  });
}

it("rejects an unsupported prerelease without modifying package.json", async () => {
  const fixture = await createPackage("1.2.3");

  await expect(
    prepareRelease({
      pkg: "example",
      release: "2.0.0-rc.1",
      getPkgDir: (pkg) => path.join(fixture.path, "packages", pkg),
    }),
  ).rejects.toThrow("Only alpha and beta prereleases are supported, received 2.0.0-rc.1");
  expect(await readVersion(fixture.path)).toBe("1.2.3");
});
