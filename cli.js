#!/usr/bin/env node
import { resolve as resolvePath } from 'path'
import polyfill from './index.js'

const [, , packagePath] = process.argv
const absolutePkgPath = resolvePath(packagePath || '.')
const results = polyfill(absolutePkgPath)

if (results.length > 0) {
  console.log(`\nSubpath linking files are created under ${absolutePkgPath}:\n`)

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

  console.log(`\nplease make sure they are added to the VCS.\n`)
} else {
  console.log(`No subpath exports under ${absolutePkgPath}`)
}
