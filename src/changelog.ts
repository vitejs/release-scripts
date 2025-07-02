import fs from 'node:fs'
import { ConventionalChangelog, type Preset } from 'conventional-changelog'
import createPreset, {
  DEFAULT_COMMIT_TYPES,
  // @ts-expect-error no types
} from 'conventional-changelog-conventionalcommits'
import type { generateChangelog as def } from './types.d.ts'

export const generateChangelog: typeof def = async ({
  getPkgDir,
  tagPrefix,
}) => {
  const preset: Preset = await createPreset({
    types: DEFAULT_COMMIT_TYPES.map((t: any) => ({ ...t, hidden: false })),
  })
  preset.writer ??= {}
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
`.trim()
  preset.writer.mainTemplate! += '\n'

  const pkgDir = getPkgDir()

  const generator = new ConventionalChangelog()
    .readPackage(`${pkgDir}/package.json`)
    .config(preset)
    .options({ releaseCount: 1 })
    .commits({ path: pkgDir })
  if (tagPrefix) {
    generator.tags({ prefix: tagPrefix })
  }

  const originalChangelog = fs.readFileSync(`${pkgDir}/CHANGELOG.md`, 'utf-8')

  const writeStream = fs.createWriteStream(`${pkgDir}/CHANGELOG.md`)
  for await (const chunk of generator.write()) {
    writeStream.write(chunk)
  }
  writeStream.write(originalChangelog)
}
