import { readFileSync, writeFileSync, symlinkSync } from 'fs'
import { join as joinPath, dirname } from 'path'

export default function polifillSubpathExports(modulePath = process.cwd()) {
  const packageConfig = readFileSync(
    `${modulePath}/package.json`,
    { encoding: 'utf8' }
  )

  const { exports } = JSON.parse(packageConfig)
  const results = []

  if (exports) {
    for(const [subpath, target] of Object.entries(exports)) {
      if(subpath !== ".") {
        const targetPath = typeof target === 'string'
          ? target
          : typeof target === 'object'
          ? target.require || target.node || target.default
          : undefined

        if (targetPath) {
          let entryFilePath;

          if (subpath[subpath.length - 1] === '/') {
            entryFilePath = subpath.slice(0, -1)
            symlinkSync(
              joinPath(modulePath, targetPath),
              joinPath(modulePath, entryFilePath)
            )
          } else {
            entryFilePath = `${subpath}.js`
            writeFileSync(
              joinPath(modulePath, entryFilePath),
              `module.exports = require('${targetPath}');\n`
            )
          }

          results.push([entryFilePath, targetPath])
        }
      }
    }
  }

  return results
}
