import prompts from "prompts";
import semver from "semver";
import colors from "picocolors";
import {
  args,
  getPackageInfo,
  getVersionChoices,
  isDryRun,
  run,
  runIfNotDry,
  step,
  updateVersion,
} from "./utils";
import type { release as def } from "./types";

export const release: typeof def = async ({
  repo,
  packages,
  logChangelog,
  generateChangelog,
  toTag,
  getPkgDir,
}) => {
  let targetVersion: string | undefined;

  const pkg: string =
    packages.length === 1
      ? packages[0]
      : (
          await prompts({
            type: "select",
            name: "pkg",
            message: "Select package",
            choices: packages.map((i) => ({ value: i, title: i })),
          })
        ).pkg;

  if (!pkg) return;

  await logChangelog(pkg);

  const { currentVersion, pkgPath } = getPackageInfo(pkg, getPkgDir);

  if (!targetVersion) {
    const { release }: { release: string } = await prompts({
      type: "select",
      name: "release",
      message: "Select release type",
      choices: getVersionChoices(currentVersion),
    });

    if (release === "custom") {
      const res: { version: string } = await prompts({
        type: "text",
        name: "version",
        message: "Input custom version",
        initial: currentVersion,
      });
      targetVersion = res.version;
    } else {
      targetVersion = release;
    }
  }

  if (!semver.valid(targetVersion)) {
    throw new Error(`invalid target version: ${targetVersion}`);
  }

  const tag = toTag(pkg, targetVersion);

  if (targetVersion.includes("beta") && !args.tag) {
    args.tag = "beta";
  }
  if (targetVersion.includes("alpha") && !args.tag) {
    args.tag = "alpha";
  }

  const { yes }: { yes: boolean } = await prompts({
    type: "confirm",
    name: "yes",
    message: `Releasing ${colors.yellow(tag)} Confirm?`,
  });

  if (!yes) return;

  step("\nUpdating package version...");
  updateVersion(pkgPath, targetVersion);
  await generateChangelog(pkg, targetVersion);

  const { stdout } = await run("git", ["diff"], { stdio: "pipe" });
  if (stdout) {
    step("\nCommitting changes...");
    await runIfNotDry("git", ["add", "-A"]);
    await runIfNotDry("git", ["commit", "-m", `release: ${tag}`]);
    await runIfNotDry("git", ["tag", tag]);
  } else {
    console.log("No changes to commit.");
    return;
  }

  step("\nPushing to GitHub...");
  await runIfNotDry("git", ["push", "origin", `refs/tags/${tag}`]);
  await runIfNotDry("git", ["push"]);

  if (isDryRun) {
    console.log(`\nDry run finished - run git diff to see package changes.`);
  } else {
    console.log(
      colors.green(
        `
Pushed, publishing should starts shortly on CI.
https://github.com/vitejs/${repo}/actions/workflows/publish.yml`,
      ),
    );
  }

  console.log();
};
