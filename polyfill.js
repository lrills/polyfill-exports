import { join as joinPath, relative as getRelativePath, dirname } from 'path'
import {
  readFileSync,
  writeFileSync,
  symlinkSync,
  lstatSync,
  unlinkSync,
  mkdirSync,
} from 'fs'

export default function polifillExportsSubpath(pkgPath = '.') {
  const packageConfig = readFileSync(
    `${pkgPath}/package.json`,
    { encoding: 'utf8' }
  )

  const { exports } = JSON.parse(packageConfig)
  if (!exports) {
    return []
  }

  // create the deeper ones precedently
  const exportPairs = Object.entries(exports).sort(([a], [b]) => a < b ? 1 : -1)
  const results = []

  for(const [subpath, target] of exportPairs) {
    if(subpath !== ".") {
      const targetSubpath = typeof target === 'string'
        ? target
        : typeof target === 'object'
        ? target.require || target.node || target.default
        : undefined

      if (targetSubpath) {
        const entryDir = dirname(subpath)
        if (entryDir !== '.') {
          mkdirSync(joinPath(pkgPath, entryDir), { recursive: true })
        }

        let relativeTargetPath = getRelativePath(entryDir, targetSubpath)
        if (relativeTargetPath[0] !== '.') {
          relativeTargetPath = `./${relativeTargetPath}`
        }

        let entrySubpath;

        if (subpath[subpath.length - 1] === '/') {
          entrySubpath = subpath.slice(0, -1)
          const linkFilePath = joinPath(pkgPath, entrySubpath)

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
          try {
            if (lstatSync(joinPath(pkgPath, subpath)).isDirectory()) {
              entrySubpath = `${subpath}/index.js`
              relativeTargetPath = joinPath('..', relativeTargetPath)
            }
          } catch {}

          writeFileSync(
            joinPath(pkgPath, entrySubpath),
            `module.exports = require('${relativeTargetPath}');\n`
          )
        }

        results.push([entrySubpath, targetSubpath])
      }
    }

  }

  return results
}
