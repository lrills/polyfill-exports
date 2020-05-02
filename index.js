import {
  readFileSync,
  writeFileSync,
  symlinkSync,
  lstatSync,
  unlinkSync,
  mkdirSync,
} from 'fs'
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
          const entryDir = dirname(subpath)
          if (entryDir !== '.') {
            mkdirSync(joinPath(modulePath, entryDir), { recursive: true })
          }


          let relativeEntry;

          if (subpath[subpath.length - 1] === '/') {
            relativeEntry = subpath.slice(0, -1)
            const absoluteEvtry = joinPath(modulePath, relativeEntry)

            let existedFileStat
            try{
              existedFileStat = lstatSync(absoluteEvtry)
            } catch {}

            if (existedFileStat) {
              if (existedFileStat.isSymbolicLink()) {
                unlinkSync(absoluteEvtry)
              } else {
                throw new Error(`file ${absoluteEvtry} already exist`)
              }
            }

            symlinkSync(joinPath(modulePath, targetPath), absoluteEvtry)
          } else {
            relativeEntry = `${subpath}.js`
            writeFileSync(
              joinPath(modulePath, relativeEntry),
              `module.exports = require('${targetPath}');\n`
            )
          }

          results.push([relativeEntry, targetPath])
        }
      }
    }
  }

  return results
}
