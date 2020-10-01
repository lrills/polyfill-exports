#!/usr/bin/env node
import { resolve as resolvePath, join as joinPath } from 'path'
import { unlinkSync, writeFileSync } from 'fs'
import { createRequire } from "module"
import { polyfillPackage } from './build.js'

const meow = createRequire(import.meta.url)("meow");
const cli = meow(`
    Usage
      $ polyfill-exports [path]

    Options
    --file, -f        File name of the script builded, default "polyfill-exports".
    --delete, -d      Delete the polyfill script file instead of building.
    --ts-declaration  Also create links of typescript .d.ts file, default to false.
    --module-only, -m Create links only while being installed from npm, default to true.

    Examples
      $ polyfill-exports ./my-package
`,
  {
    flags: {
      file: { type: 'string', alias: 'f' },
      delete: { type: 'boolean', alias: 'd' },
      tsDeclaration: { type: 'boolean', default: false },
      moduleOnly: { type: 'boolean', default: true, alias: 'm' },
    }
  }
);

const { flags, input } = cli
const pkgPath = resolvePath(input[0] || '.')
const scriptPath = joinPath(pkgPath, flags.file || 'polyfill-exports.js')

if (flags.delete) {
  try {
    unlinkSync(scriptPath)
  } catch {}
} else {
  const content = polyfillPackage(pkgPath, {
    tsDeclaration: flags.tsDeclaration,
    moduleOnly: flags.moduleOnly,
  });
  if (content) {
    writeFileSync(scriptPath, content, { mode: 0o775 })
  }
}
