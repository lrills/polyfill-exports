#!/usr/bin/env node
import { resolve as resolvePath } from 'path'
import { createRequire } from "module";
import polyfill from './polyfill.js'
import clear from './clear.js'

const meow = createRequire(import.meta.url)("meow");
const cli = meow(`
    Usage
      $ polyfill-exports [path]

    Options
      --clear  Clear all polyfill files instead of creation.

    Examples
      $ polyfill-exports ./my-package
`,
  {
    flags: {
      clear: { type: 'boolean' }
    }
  }
);

const pkgPath = resolvePath(cli.input[0] || '.')

if (cli.flags.clear) {
  const results = clear(pkgPath)

  if (results.length > 0) {
    console.log(`\nPolyfill files are deleted under ${pkgPath}:\n`)

    for(const file of results) {
      console.log(`\t${file}`)
    }

    console.log(`\nplease add the changes into VCS.\n`)
  } else {
    console.log(`\nNo polyfill files to delete under "${pkgPath}".\n`)
  }
} else {
  const results = polyfill(pkgPath)

  if (results.length > 0) {
    console.log(`\nPolyfill files are created under "${pkgPath}":\n`)

    const maxEntryNameLen = results.reduce(
      (maximum, [entryName]) => Math.max(maximum, entryName.length),
      0
    )

    for(const [entryFile, targetPath] of results) {
      const spacesForAlignment = ' '.repeat(maxEntryNameLen - entryFile.length)
      console.log(
        `\t${entryFile}${spacesForAlignment}  ->  ${targetPath}`
      )
    }

    console.log(`\nplease add the changes into VCS.\n`)
  } else {
    console.log(`\nNo subpath exports under "${pkgPath}".\n`)
  }
}
