import polyfill from './index.js'

const [, , path] = process.argv

const results = polyfill(path)

console.log(`\nThe linking files to export subpaths are created:\n`)

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

console.log(`\nplease make sure they are added to th VCS.\n`)
