import fs from 'fs'
import assert from 'assert'
import { polyfillPackage } from '../build.js'

const expectedScriptHead = `#!/usr/bin/env node
'use strict';

var fs = require('fs');
`

export default {
  ['first time polyfill'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js",
        "./bar/": "./lib/bar/"
      }
    }`)

    assert.equal(
      polyfillPackage(pkgDir),
`${expectedScriptHead}
fs.symlinkSync('./lib/foo.js', './foo.js');
fs.symlinkSync('./lib/bar', './bar');
`
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


    assert.equal(
      polyfillPackage(pkgDir),
`${expectedScriptHead}
fs.symlinkSync('./lib/foo.js', './foo.js');
`
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

    assert.equal(
      polyfillPackage(pkgDir),
`${expectedScriptHead}
fs.symlinkSync('./lib/foo.cjs', './foo.js');
fs.symlinkSync('./lib/bar.js', './bar.js');
fs.symlinkSync('./lib/baz.js', './baz.js');
`
    )
  },

  ['handle non-shallow path'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./deep/foo": "./lib/deep/foo.js",
        "./really/deep/bar": "./lib/really/deep/bar.js",
        "./really/deep/baz/": "./lib/really/deep/baz/"
      }
    }`)

    assert.equal(
      polyfillPackage(pkgDir),
`${expectedScriptHead}
fs.mkdirSync('./deep');
fs.mkdirSync('./really');
fs.mkdirSync('./really/deep');

fs.symlinkSync('../lib/deep/foo.js', './deep/foo.js');
fs.symlinkSync('../../lib/really/deep/bar.js', './really/deep/bar.js');
fs.symlinkSync('../../lib/really/deep/baz', './really/deep/baz');
`
    )
  },

  ['nested subpathes'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./a": "./lib/a/index.js",
        "./a/b": "./lib/a/b/index.js",
        "./a/b/c": "./lib/a/b/c.js",
        "./a/b/d/": "./lib/a/b/d/"
      }
    }`)

    assert.equal(
      polyfillPackage(pkgDir),
`${expectedScriptHead}
fs.mkdirSync('./a');
fs.mkdirSync('./a/b');

fs.symlinkSync('./lib/a/index.js', './a.js');
fs.symlinkSync('../lib/a/b/index.js', './a/b.js');
fs.symlinkSync('../../lib/a/b/c.js', './a/b/c.js');
fs.symlinkSync('../../lib/a/b/d', './a/b/d');
`
    )
  },

  ['with tsDeclaration option'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./a": "./lib/a/index.js",
        "./a/b": "./lib/a/b/index.js",
        "./a/b/c": "./lib/a/b/c.js",
        "./d": "./lib/d.js"
      }
    }`)

    assert.equal(
      polyfillPackage(pkgDir, { tsDeclaration: true }),
`${expectedScriptHead}
fs.mkdirSync('./a');
fs.mkdirSync('./a/b');

fs.symlinkSync('./lib/a/index.js', './a.js');
fs.symlinkSync('./lib/a/index.d.ts', './a.d.ts');
fs.symlinkSync('../lib/a/b/index.js', './a/b.js');
fs.symlinkSync('../lib/a/b/index.d.ts', './a/b.d.ts');
fs.symlinkSync('../../lib/a/b/c.js', './a/b/c.js');
fs.symlinkSync('../../lib/a/b/c.d.ts', './a/b/c.d.ts');
fs.symlinkSync('./lib/d.js', './d.js');
fs.symlinkSync('./lib/d.d.ts', './d.d.ts');
`
    )
  },

  ['with onlyModule option'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js",
        "./bar/": "./lib/bar/"
      }
    }`)

    assert.equal(
      polyfillPackage(pkgDir, { onlyModule: true }),
`${expectedScriptHead}
if (process.cwd().indexOf('node_modules') === -1) {
  process.exit(0);
}

fs.symlinkSync('./lib/foo.js', './foo.js');
fs.symlinkSync('./lib/bar', './bar');
`
    )
  },
}
