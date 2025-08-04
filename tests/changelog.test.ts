import fs from "node:fs/promises";
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

  const initialCwd = process.cwd();
  process.chdir(fixture.path);
  onTestFinished(() => process.chdir(initialCwd));

  await execa("git", ["init"]);
  await execa("git", [
    "remote",
    "add",
    "origin",
    "https://github.com/vitejs/test.git",
  ]);

  return fixture;
}

async function gitCommit(message: string) {
  // Write random text to file to allow conventional-changelog to detect commit
  await fs.writeFile("dummy.txt", Math.random().toString(36).substring(2, 15));
  await execa("git", ["add", "."]);
  await execa("git", ["commit", "-m", message]);
}

async function updatePackageJsonVersion(version: string) {
  const pkgPath = "./package.json";
  const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
  pkg.version = version;
  await fs.writeFile(pkgPath, JSON.stringify(pkg));
}

async function initChangelog() {
  await gitCommit("chore: initial commit");
  await generateChangelogForRelease();
}

async function generateChangelogForRelease() {
  await generateChangelog({ getPkgDir: () => ".", tagPrefix: "" });

  // Tag the version so conventional-changelog tracks this as the last release
  // and won't track this commit for the next release.
  const version = JSON.parse(
    await fs.readFile("./package.json", "utf8"),
  ).version;
  const tag = `v${version}`;
  await execa("git", ["tag", "-a", "-m", tag, tag]);
}

async function readChangelog() {
  const changelog = await fs.readFile("./CHANGELOG.md", "utf8");
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
  await createProjectFixture();
  await gitCommit("chore: initial commit");
  await generateChangelogForRelease();
  expect(await readChangelog()).toMatchSnapshot();
});

it("generates a changelog with commits", async () => {
  await createProjectFixture();
  await initChangelog();

  await gitCommit("fix: fix a bug (#1)");
  await updatePackageJsonVersion("1.0.1");
  await generateChangelogForRelease();
  expect(await readChangelog()).toMatchSnapshot();

  await gitCommit("feat: add new feature");
  await updatePackageJsonVersion("1.1.0");
  await generateChangelogForRelease();
  expect(await readChangelog()).toMatchSnapshot();
});

it("generates a changelog with breaking changes", async () => {
  await createProjectFixture();
  await initChangelog();
  await gitCommit("feat!: introduce breaking change");
  await gitCommit("fix: fix a bug (#1)");
  await updatePackageJsonVersion("2.0.0");
  await generateChangelogForRelease();
  expect(await readChangelog()).toMatchSnapshot();
});
