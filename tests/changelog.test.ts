import fs from "node:fs/promises";
import path from "node:path";
import { it, expect, onTestFinished } from "vitest";
import { createFixture, type FileTree } from "fs-fixture";
import { execa } from "execa";
import { generateChangelog } from "../src/changelog.ts";

async function createProjectFixture(source?: FileTree) {
  const fixture = await createFixture({
    "package.json": JSON.stringify({
      name: "test-project",
      version: "1.0.0",
      private: true,
    }),
    ...source,
  });
  onTestFinished(() => fixture.rm());

  await execa("git", ["init"], { cwd: fixture.path });
  await execa(
    "git",
    ["remote", "add", "origin", "https://github.com/vitejs/test.git"],
    { cwd: fixture.path },
  );

  return fixture;
}

async function gitCommit(cwd: string, message: string) {
  // Write random text to file to allow conventional-changelog to detect commit
  await fs.writeFile(
    path.join(cwd, "dummy.txt"),
    Math.random().toString(36).substring(2, 15),
  );
  await execa("git", ["add", "."], { cwd });
  await execa("git", ["commit", "-m", message], { cwd });
}

async function updatePackageJsonVersion(cwd: string, version: string) {
  const pkgPath = path.join(cwd, "./package.json");
  const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
  pkg.version = version;
  await fs.writeFile(pkgPath, JSON.stringify(pkg));
}

async function initChangelog(cwd: string) {
  await gitCommit(cwd, "chore: initial commit");
  await generateChangelogForRelease(cwd);
}

async function generateChangelogForRelease(cwd: string) {
  await generateChangelog({ getPkgDir: () => cwd, tagPrefix: "" });

  // Tag the version so conventional-changelog tracks this as the last release
  // and won't track this commit for the next release.
  const version = JSON.parse(
    await fs.readFile(path.join(cwd, "./package.json"), "utf8"),
  ).version;
  const tag = `v${version}`;
  await execa("git", ["tag", "-a", "-m", tag, tag], { cwd });
}

async function readChangelog(cwd: string) {
  const changelog = await fs.readFile(path.join(cwd, "./CHANGELOG.md"), "utf8");
  return (
    changelog
      // Normalize date
      .replace(/\d{4}-\d{2}-\d{2}/g, "yyyy-mm-dd")
      // Normalize short commit hashes
      .replace(/\[[a-z0-9]{7}\]/g, `[${"x".repeat(7)}]`)
      // Normalize full commit hashes
      .replace(/\/[a-z0-9]{40}\)/g, `/${"x".repeat(40)})`)
  );
}

it("generates a new changelog for empty project", async () => {
  const fixture = await createProjectFixture();
  await gitCommit(fixture.path, "chore: initial commit");
  await generateChangelogForRelease(fixture.path);
  expect(await readChangelog(fixture.path)).toMatchSnapshot();
});

it("generates a changelog with commits", async () => {
  const fixture = await createProjectFixture();
  await initChangelog(fixture.path);

  await gitCommit(fixture.path, "fix: fix a bug (#1)");
  await updatePackageJsonVersion(fixture.path, "1.0.1");
  await generateChangelogForRelease(fixture.path);
  expect(await readChangelog(fixture.path)).toMatchSnapshot();

  await gitCommit(fixture.path, "feat: add new feature");
  await updatePackageJsonVersion(fixture.path, "1.1.0");
  await generateChangelogForRelease(fixture.path);
  expect(await readChangelog(fixture.path)).toMatchSnapshot();
});

it("generates a changelog with breaking changes", async () => {
  const fixture = await createProjectFixture();
  await initChangelog(fixture.path);
  await gitCommit(fixture.path, "feat!: introduce breaking change");
  await gitCommit(fixture.path, "fix: fix a bug (#1)");
  await updatePackageJsonVersion(fixture.path, "2.0.0");
  await generateChangelogForRelease(fixture.path);
  expect(await readChangelog(fixture.path)).toMatchSnapshot();
});
