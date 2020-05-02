import { join as joinPath, relative as getRelativePath, dirname } from 'path'
import {
  readFileSync,
  writeFileSync,
  symlinkSync,
  lstatSync,
  unlinkSync,
  mkdirSync,
} from 'fs'

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
        const targetSubpath = typeof target === 'string'
          ? target
          : typeof target === 'object'
          ? target.require || target.node || target.default
          : undefined

        if (targetSubpath) {
          const entryDir = dirname(subpath)
          if (entryDir !== '.') {
            mkdirSync(joinPath(modulePath, entryDir), { recursive: true })
          }

          let relativeTargetPath = getRelativePath(entryDir, targetSubpath)
          if (relativeTargetPath[0] !== '.') {
            relativeTargetPath = `./${relativeTargetPath}`
          }

          let entrySubpath;

          if (subpath[subpath.length - 1] === '/') {
            entrySubpath = subpath.slice(0, -1)
            const linkFilePath = joinPath(modulePath, entrySubpath)

            let existedFileStat
            try{
              existedFileStat = lstatSync(linkFilePath)
            } catch {}

            if (existedFileStat) {
              if (existedFileStat.isSymbolicLink()) {
                unlinkSync(linkFilePath)
              } else {
                throw new Error(`file ${linkFilePath} already exist`)
              }
            }

            symlinkSync(relativeTargetPath, linkFilePath)
          } else {
            entrySubpath = `${subpath}.js`

            writeFileSync(
              joinPath(modulePath, entrySubpath),
              `module.exports = require('${relativeTargetPath}');\n`
            )
          }

          results.push([entrySubpath, targetSubpath])
        }
      }
    }
  }

  return results
}
