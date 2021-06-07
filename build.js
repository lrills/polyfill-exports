import {
  join as joinPath,
  relative as getRelativePath,
  dirname,
  basename,
} from 'path';
import { readFileSync } from 'fs';

export function polyfillPackage(pkgPath = '.', options = {}) {
  const packageConfig = readFileSync(`${pkgPath}/package.json`, {
    encoding: 'utf8',
  });

  const { exports } = JSON.parse(packageConfig);
  if (!exports) {
    return undefined;
  }

  return polyfillExports(exports, options);
}

export function polyfillExports(
  exports,
  { tsDeclaration = false, moduleOnly = true }
) {
  const prerequisiteDirs = new Set();
  const linkPairs = [];

  for (const [subpath, target] of Object.entries(exports)) {
    if (subpath !== '.') {
      const targetSubpath =
        typeof target === 'string'
          ? target
          : typeof target === 'object'
          ? target.require || target.node || target.default
          : undefined;

      if (targetSubpath) {
        const entryDir = dirname(subpath.replace(/\/\*$/, ''));

        let dir = entryDir;
        while (dir !== '.' && !prerequisiteDirs.has(dir)) {
          prerequisiteDirs.add(dir);
          dir = dirname(dir);
        }

        let relativeTargetPath = getRelativePath(entryDir, targetSubpath);
        if (relativeTargetPath[0] !== '.') {
          relativeTargetPath = `./${relativeTargetPath}`;
        }

        linkPairs.push([subpath, relativeTargetPath]);
      }
    }
  }

  if (linkPairs.length === 0) {
    return undefined;
  }

  // match pattern like "./foo/*.mjs"
  const subpathPatternMatcher = /\/\*\.[^\/]+$/;

  const script = `#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
${
  moduleOnly
    ? `
if (process.cwd().indexOf('node_modules') === -1) {
  process.exit(0);
}
`
    : ''
}
function polyfillPath(posixPath) {
  return path.join.apply(null, posixPath.split(path.posix.sep));
}
${
  prerequisiteDirs.size > 0
    ? `\n${[...prerequisiteDirs]
        .sort()
        .map((dir) => `fs.mkdirSync(polyfillPath('${dir}'));`)
        .join('\n')}\n`
    : ''
}
${linkPairs
  .reduce((commands, [subpath, target]) => {
    if (subpath.slice(-2) === '/*' && subpathPatternMatcher.test(target)) {
      // subpath is a folder
      const targetDir = target.replace(subpathPatternMatcher, '');
      const linkDir = subpath.slice(0, -2);
      commands.push(
        `fs.symlinkSync(polyfillPath('${targetDir}'), polyfillPath('${linkDir}'), process.platform === 'win32' ? 'junction' : 'dir');`
      );
    } else {
      commands.push(
        `fs.writeFileSync(polyfillPath('${subpath}.js'), 'module.exports=require("${target}");\\n');`
      );
      if (tsDeclaration) {
        const targetModuleName = target.replace(/\.[^\/\.]+$/, '');
        commands.push(
          `fs.writeFileSync(polyfillPath('${subpath}.d.ts'), 'export { default } from "${targetModuleName}";\\nexport * from "${targetModuleName}";\\n');`
        );
      }
    }
    return commands;
  }, [])
  .join('\n')}
`;
  return script;
}
