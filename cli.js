#!/usr/bin/env node
import { resolve as resolvePath, join as joinPath } from 'path'
import { unlinkSync, writeFileSync } from 'fs'
import { createRequire } from "module"
import build from './build.js'

const meow = createRequire(import.meta.url)("meow");
const cli = meow(`
    Usage
      $ polyfill-exports [path]

    Options
    --file, -f    File name of the script builded, default "polyfill-exports".
    --delete, -d  Delete the polyfill script file

    Examples
      $ polyfill-exports ./my-package
`,
  {
    flags: {
      file: { type: 'string', alias: 'f' },
      delete: { type: 'boolean', alias: 'd' },
    }
  }
);

const pkgPath = resolvePath(cli.input[0] || '.')
const scriptFile = joinPath(pkgPath, cli.flags.file || 'polyfill-exports')

if (cli.flags.delete) {
  try {
    unlinkSync(scriptFile)
  } catch {}
} else {
  const content = build(pkgPath)
  if (content) {
    writeFileSync(scriptFile, content, { mode: 0o665 })
  }
}
