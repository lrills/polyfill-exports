#!/usr/bin/env node
import polyfill from './index.js'

const [, , packagePath] = process.argv
const results = polyfill(packagePath)

console.log(`\nLinking files to export subpaths are created:\n`)

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