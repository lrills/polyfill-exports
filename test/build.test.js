import fs from 'fs'
import { polyfillPackage } from '../build.js'
import assertEqualDiff from './assertEqualDiff.js'

const expectedScriptHead = `#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

if (process.cwd().indexOf('node_modules') === -1) {
  process.exit(0);
}

function polyfillPath(posixPath) {
  return path.join.apply(null, posixPath.split(path.posix.sep));
}
`

export default {
  ['first time polyfill'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js",
        "./bar/*": "./lib/bar/*.js"
      }
    }`)

    assertEqualDiff(
`${expectedScriptHead}
fs.writeFileSync(polyfillPath('./foo.js'), 'module.exports=require("./lib/foo.js");\\n');
fs.symlinkSync(polyfillPath('./lib/bar'), polyfillPath('./bar'), process.platform === 'win32' ? 'junction' : 'dir');
`,
      polyfillPackage(pkgDir)
    )
  },

  ['ignore "."'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        ".": "./lib/index.js",
        "./foo": "./lib/foo.js"
      }
    }`)


    assertEqualDiff(
`${expectedScriptHead}
fs.writeFileSync(polyfillPath('./foo.js'), 'module.exports=require("./lib/foo.js");\\n');
`,
      polyfillPackage(pkgDir)
    )
  },

  ['conditional export order'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": {
          "import": "./lib/foo.mjs",
          "require": "./lib/foo.cjs",
          "node": "./lib/foo.js",
          "default": "./lib/foo.x"
        },
        "./bar": {
          "node": "./lib/bar.js",
          "default": "./lib/bar.x"
        },
        "./baz": {
          "default": "./lib/baz.js"
        }
      }
    }`)

    assertEqualDiff(
`${expectedScriptHead}
fs.writeFileSync(polyfillPath('./foo.js'), 'module.exports=require("./lib/foo.cjs");\\n');
fs.writeFileSync(polyfillPath('./bar.js'), 'module.exports=require("./lib/bar.js");\\n');
fs.writeFileSync(polyfillPath('./baz.js'), 'module.exports=require("./lib/baz.js");\\n');
`,
      polyfillPackage(pkgDir)
    )
  },

  ['handle non-shallow path'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./deep/foo": "./lib/deep/foo.js",
        "./really/deep/bar": "./lib/really/deep/bar.js",
        "./really/deep/baz/*": "./lib/really/deep/baz/*.js"
      }
    }`)

    assertEqualDiff(
`${expectedScriptHead}
fs.mkdirSync(polyfillPath('./deep'));
fs.mkdirSync(polyfillPath('./really'));
fs.mkdirSync(polyfillPath('./really/deep'));

fs.writeFileSync(polyfillPath('./deep/foo.js'), 'module.exports=require("../lib/deep/foo.js");\\n');
fs.writeFileSync(polyfillPath('./really/deep/bar.js'), 'module.exports=require("../../lib/really/deep/bar.js");\\n');
fs.symlinkSync(polyfillPath('../../lib/really/deep/baz'), polyfillPath('./really/deep/baz'), process.platform === 'win32' ? 'junction' : 'dir');
`,
      polyfillPackage(pkgDir)
    )
  },

  ['nested subpathes'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./a": "./lib/a/index.js",
        "./a/b": "./lib/a/b/index.js",
        "./a/b/c": "./lib/a/b/c.js",
        "./a/b/d/*": "./lib/a/b/d/*.js"
      }
    }`)

    assertEqualDiff(
`${expectedScriptHead}
fs.mkdirSync(polyfillPath('./a'));
fs.mkdirSync(polyfillPath('./a/b'));

fs.writeFileSync(polyfillPath('./a.js'), 'module.exports=require("./lib/a/index.js");\\n');
fs.writeFileSync(polyfillPath('./a/b.js'), 'module.exports=require("../lib/a/b/index.js");\\n');
fs.writeFileSync(polyfillPath('./a/b/c.js'), 'module.exports=require("../../lib/a/b/c.js");\\n');
fs.symlinkSync(polyfillPath('../../lib/a/b/d'), polyfillPath('./a/b/d'), process.platform === 'win32' ? 'junction' : 'dir');
`,
      polyfillPackage(pkgDir)
    )
  },

  ['with tsDeclaration option set to true'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./a": "./lib/a/index.js",
        "./a/b": "./lib/a/b/index.js",
        "./a/b/c": "./lib/a/b/c.js",
        "./d": "./lib/d.js"
      }
    }`)

    assertEqualDiff(
`${expectedScriptHead}
fs.mkdirSync(polyfillPath('./a'));
fs.mkdirSync(polyfillPath('./a/b'));

fs.writeFileSync(polyfillPath('./a.js'), 'module.exports=require("./lib/a/index.js");\\n');
fs.writeFileSync(polyfillPath('./a.d.ts'), 'export { default } from "./lib/a/index";\\nexport * from "./lib/a/index";\\n');
fs.writeFileSync(polyfillPath('./a/b.js'), 'module.exports=require("../lib/a/b/index.js");\\n');
fs.writeFileSync(polyfillPath('./a/b.d.ts'), 'export { default } from "../lib/a/b/index";\\nexport * from "../lib/a/b/index";\\n');
fs.writeFileSync(polyfillPath('./a/b/c.js'), 'module.exports=require("../../lib/a/b/c.js");\\n');
fs.writeFileSync(polyfillPath('./a/b/c.d.ts'), 'export { default } from "../../lib/a/b/c";\\nexport * from "../../lib/a/b/c";\\n');
fs.writeFileSync(polyfillPath('./d.js'), 'module.exports=require("./lib/d.js");\\n');
fs.writeFileSync(polyfillPath('./d.d.ts'), 'export { default } from "./lib/d";\\nexport * from "./lib/d";\\n');
`,
      polyfillPackage(pkgDir, { tsDeclaration: true })
    )
  },

  ['with moduleOnly option set to false'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js",
        "./bar/*": "./lib/bar/*.js"
      }
    }`)

    assertEqualDiff(
`#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

function polyfillPath(posixPath) {
  return path.join.apply(null, posixPath.split(path.posix.sep));
}

fs.writeFileSync(polyfillPath('./foo.js'), 'module.exports=require("./lib/foo.js");\\n');
fs.symlinkSync(polyfillPath('./lib/bar'), polyfillPath('./bar'), process.platform === 'win32' ? 'junction' : 'dir');
`,
      polyfillPackage(pkgDir, { moduleOnly: false })
    )
  },
}
