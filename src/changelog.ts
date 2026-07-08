import fs from "node:fs";
import path from "node:path";
import { ConventionalChangelog, type Preset } from "conventional-changelog";
import createPreset, {
  DEFAULT_COMMIT_TYPES,
  formatCommitUrl,
} from "conventional-changelog-conventionalcommits";
import type { generateChangelog as def } from "./types.d.ts";
import {
  heading,
  link,
  words,
  segments,
  each,
  list,
  newline,
  bold,
  type CommitNote,
  compareUrl,
  type FinalTemplateContext,
  type CommitKnownProps,
} from "@conventional-changelog/template";

declare module "conventional-changelog-conventionalcommits" {
  export const DEFAULT_COMMIT_TYPES: readonly CommitType[];
  export function formatCommitUrl<Commit extends CommitKnownProps = CommitKnownProps>(
    context: FinalTemplateContext<Commit>,
    commit: { hash?: string },
  ): string;
}

interface ExtendedCommitNote extends CommitNote {
  commit: {
    scope?: string;
    subject: string;
    hash?: string;
    shortHash?: string;
  };
}

export const generateChangelog: typeof def = async ({ getPkgDir, tagPrefix }) => {
  const preset: Preset = createPreset({
    types: DEFAULT_COMMIT_TYPES.map((t) => ({
      ...t,
      effect: t.effect === "hidden" ? "changelog" : t.effect,
    })),
  });
  preset.writer ??= {};
  preset.writer.headerPartial = function (context) {
    const { linkCompare, version, title, date, isPatch } = context;
    const versionText = linkCompare ? link(version!, compareUrl(context)) : version;
    const headingText = words(versionText, title && `"${title}"`, date && `(${date})`);

    return heading(2, isPatch ? `<small>${headingText}</small>` : headingText);
  };
  preset.writer.template = function (context) {
    const {
      headerPartial,
      preamblePartial,
      commitPartial,
      footerPartial,
      noteGroups,
      commitGroups,
    } = context;

    return (
      headerPartial(context) +
      "\n" +
      segments(
        preamblePartial(context),
        each(
          noteGroups,
          (group) =>
            segments(
              heading(3, words("⚠", group.title)),
              list(group.notes, (_note) => {
                const note = _note as ExtendedCommitNote;
                return words(
                  note.commit.scope && bold(`${note.commit.scope}:`),
                  note.commit.subject,
                  note.commit.hash &&
                    `(${link(note.commit.shortHash!, formatCommitUrl(context, note.commit))})`,
                );
              }),
            ),
          newline(2),
        ),
        each(
          commitGroups,
          (group) =>
            segments(
              group.title && heading(3, group.title),
              list(group.commits, (commit) => commitPartial(context, commit)),
            ),
          newline(2),
        ),
        footerPartial(context),
      )
    );
  };

  const pkgDir = getPkgDir();

  const generator = new ConventionalChangelog(pkgDir)
    .readPackage()
    .config(preset)
    .options({ releaseCount: 1 })
    .commits({ path: "." });
  if (tagPrefix) {
    generator.tags({ prefix: tagPrefix });
  }

  const originalChangelog = fs.existsSync(path.join(pkgDir, "CHANGELOG.md"))
    ? fs.readFileSync(path.join(pkgDir, "CHANGELOG.md"), "utf-8")
    : "";

  const writeStream = fs.createWriteStream(path.join(pkgDir, "CHANGELOG.md"));
  for await (const chunk of generator.write()) {
    writeStream.write(chunk);
  }
  writeStream.write("\n");
  writeStream.write(originalChangelog);
};
