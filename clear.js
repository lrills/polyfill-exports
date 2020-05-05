import { join as joinPath, dirname } from 'path'
import { readFileSync, lstatSync, unlinkSync, rmdirSync } from 'fs'

export default function clearExportsSubpath(pkgPath = '.') {
  const packageConfig = readFileSync(
    `${pkgPath}/package.json`,
    { encoding: 'utf8' }
  )

  const { exports } = JSON.parse(packageConfig)
  if (!exports) {
    return []
  }

  const results = []

  for(const subpath of Object.keys(exports)) {
    if(subpath !== ".") {
      if (subpath[subpath.length - 1] === '/') {
        const linkPath = subpath.slice(0, -1)
        const absLinkPath = joinPath(pkgPath, linkPath)

        try {
          if (lstatSync(absLinkPath).isSymbolicLink()) {
            unlinkSync(absLinkPath)
            results.push(linkPath)
          }
        } catch {}
      } else {
        try {
          if (lstatSync(joinPath(pkgPath, subpath)).isDirectory()) {
            const indexFilePath = `${subpath}/index.js`
            const absIndexFilePath = joinPath(pkgPath, indexFilePath)

            if (lstatSync(absIndexFilePath).isFile()) {
              unlinkSync(absIndexFilePath)
              results.push(indexFilePath)
            }
          }
        } catch {}

        try {
          const filePath = `${subpath}.js`
          const absFilePath = joinPath(pkgPath, filePath)

          if (lstatSync(absFilePath).isFile()) {
            unlinkSync(absFilePath)
            results.push(filePath)
          }
        } catch {}
      }

      const subDir = dirname(subpath)
      if (subDir !== '.') {
        try {
          rmdirSync(joinPath(pkgPath, subDir))
        } catch {}
      }
    }
  }

  return results
}
