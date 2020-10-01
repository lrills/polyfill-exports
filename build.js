import {
  join as joinPath,
  relative as getRelativePath,
  dirname,
  basename,
} from 'path'
import { readFileSync } from 'fs'

export function polyfillPackage(pkgPath = '.', options={}) {
  const packageConfig = readFileSync(
    `${pkgPath}/package.json`,
    { encoding: 'utf8' }
  )

  const { exports } = JSON.parse(packageConfig)
  if (!exports) {
    return undefined
  }

  return polyfillExports(exports, options)
}

export function polyfillExports(exports, { tsDeclaration=false, moduleOnly=true }) {
  const prerequisiteDirs = new Set()
  const linkPairs = []

  for(const [subpath, target] of Object.entries(exports)) {
    if(subpath !== ".") {
      const targetSubpath = typeof target === 'string'
        ? target
        : typeof target === 'object'
        ? target.require || target.node || target.default
        : undefined

      if (targetSubpath) {
        const entryDir = dirname(subpath)

        let dir = entryDir
        while (dir !== '.' && !prerequisiteDirs.has(dir)) {
          prerequisiteDirs.add(dir)
          dir = dirname(dir)
        }


        let relativeTargetPath = getRelativePath(entryDir, targetSubpath)
        if (relativeTargetPath[0] !== '.') {
          relativeTargetPath = `./${relativeTargetPath}`
        }

        linkPairs.push([subpath, relativeTargetPath])
      }
    }
  }

  if (linkPairs.length === 0) {
    return undefined
  }


  const script =
`#!/usr/bin/env node
'use strict';

var fs = require('fs');
${moduleOnly ? `
if (process.cwd().indexOf('node_modules') === -1) {
  process.exit(0);
}
` : ''
}${
  prerequisiteDirs.size > 0
    ? `\n${
        [...prerequisiteDirs].sort().map(dir =>
          `fs.mkdirSync('${dir}');`
        ).join('\n')
      }\n`
    : ''
}
${
  linkPairs
    .reduce((commands, [subpath, target]) => {
      if (subpath[subpath.length - 1] === '/') {
        // subpath is a folder
        commands.push(`fs.symlinkSync('${target}', '${subpath.slice(0, -1)}');`)
      } else {
        commands.push(`fs.symlinkSync('${target}', '${subpath}.js');`)
        if (tsDeclaration) {
          const targetName = basename(target, '.js')
          const tsDeclarationTarget = `${dirname(target)}/${targetName}.d.ts`
          commands.push(
            `fs.symlinkSync('${tsDeclarationTarget}', '${subpath}.d.ts');`
          )
        }
      }
      return commands
    }, []).join('\n')
}
`
  return script
}
