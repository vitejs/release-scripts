import fs from "node:fs";
import path from "node:path";
import { ConventionalChangelog, type Preset } from "conventional-changelog";
import createPreset, {
  DEFAULT_COMMIT_TYPES,
  // @ts-expect-error no types
} from "conventional-changelog-conventionalcommits";
import type { generateChangelog as def } from "./types.d.ts";

export const generateChangelog: typeof def = async ({
  getPkgDir,
  tagPrefix,
}) => {
  const preset: Preset = await createPreset({
    types: DEFAULT_COMMIT_TYPES.map((t: any) => ({ ...t, hidden: false })),
  });
  preset.writer ??= {};
  preset.writer.headerPartial = `
## {{#if isPatch~}} <small> {{~/if~}}
{{#if @root.linkCompare~}}
[{{version}}](
{{~#if @root.repository~}}
  {{~#if @root.host}}
    {{~@root.host}}/
  {{~/if}}
  {{~#if @root.owner}}
    {{~@root.owner}}/
  {{~/if}}
  {{~@root.repository}}
{{~else}}
  {{~@root.repoUrl}}
{{~/if~}}
/compare/{{previousTag}}...{{currentTag}})
{{~else}}
{{~version}}
{{~/if}}
{{~#if title}} "{{title}}"
{{~/if}}
{{~#if date}} ({{date}})
{{~/if}}
{{~#if isPatch~}} </small> {{~/if}}
`.trim();
  preset.writer.mainTemplate =
    `
{{> header}}
{{#if noteGroups}}
{{#each noteGroups}}

### ⚠ {{title}}

{{#each notes}}
* {{#if commit.scope}}**{{commit.scope}}:** {{/if}}{{commit.subject}} {{#if commit.hash}}([{{commit.shortHash}}](https://github.com/{{@root.owner}}/{{@root.repository}}/commit/{{commit.hash}})){{/if}}
{{/each}}
{{/each}}
{{/if}}
{{#each commitGroups}}

{{#if title}}
### {{title}}

{{/if}}
{{#each commits}}
{{> commit root=@root}}
{{/each}}
{{/each}}`.trim() + "\n";

  const pkgDir = getPkgDir();

  const generator = new ConventionalChangelog(pkgDir)
    .readPackage()
    .config(preset)
    .options({ releaseCount: 1 });
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
  writeStream.write(originalChangelog);
};
