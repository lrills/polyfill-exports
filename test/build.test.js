import fs from 'fs'
import assert from 'assert'
import { polyfillPackage } from '../build.js'

const expectedScriptHead = `#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

if (process.cwd().indexOf('node_modules') === -1) {
  process.exit(0);
}

function polyfillPath(posixPath) {
  return path.join(posixPath.split(path.posix.sep));
}
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
fs.symlinkSync(polyfillPath('./lib/foo.js'), polyfillPath('./foo.js'));
fs.symlinkSync(polyfillPath('./lib/bar'), polyfillPath('./bar'));
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
fs.symlinkSync(polyfillPath('./lib/foo.js'), polyfillPath('./foo.js'));
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
fs.symlinkSync(polyfillPath('./lib/foo.cjs'), polyfillPath('./foo.js'));
fs.symlinkSync(polyfillPath('./lib/bar.js'), polyfillPath('./bar.js'));
fs.symlinkSync(polyfillPath('./lib/baz.js'), polyfillPath('./baz.js'));
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
fs.mkdirSync(polyfillPath('./deep'));
fs.mkdirSync(polyfillPath('./really'));
fs.mkdirSync(polyfillPath('./really/deep'));

fs.symlinkSync(polyfillPath('../lib/deep/foo.js'), polyfillPath('./deep/foo.js'));
fs.symlinkSync(polyfillPath('../../lib/really/deep/bar.js'), polyfillPath('./really/deep/bar.js'));
fs.symlinkSync(polyfillPath('../../lib/really/deep/baz'), polyfillPath('./really/deep/baz'));
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
fs.mkdirSync(polyfillPath('./a'));
fs.mkdirSync(polyfillPath('./a/b'));

fs.symlinkSync(polyfillPath('./lib/a/index.js'), polyfillPath('./a.js'));
fs.symlinkSync(polyfillPath('../lib/a/b/index.js'), polyfillPath('./a/b.js'));
fs.symlinkSync(polyfillPath('../../lib/a/b/c.js'), polyfillPath('./a/b/c.js'));
fs.symlinkSync(polyfillPath('../../lib/a/b/d'), polyfillPath('./a/b/d'));
`
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

    assert.equal(
      polyfillPackage(pkgDir, { tsDeclaration: true }),
`${expectedScriptHead}
fs.mkdirSync(polyfillPath('./a'));
fs.mkdirSync(polyfillPath('./a/b'));

fs.symlinkSync(polyfillPath('./lib/a/index.js'), polyfillPath('./a.js'));
fs.symlinkSync(polyfillPath('./lib/a/index.d.ts'), polyfillPath('./a.d.ts'));
fs.symlinkSync(polyfillPath('../lib/a/b/index.js'), polyfillPath('./a/b.js'));
fs.symlinkSync(polyfillPath('../lib/a/b/index.d.ts'), polyfillPath('./a/b.d.ts'));
fs.symlinkSync(polyfillPath('../../lib/a/b/c.js'), polyfillPath('./a/b/c.js'));
fs.symlinkSync(polyfillPath('../../lib/a/b/c.d.ts'), polyfillPath('./a/b/c.d.ts'));
fs.symlinkSync(polyfillPath('./lib/d.js'), polyfillPath('./d.js'));
fs.symlinkSync(polyfillPath('./lib/d.d.ts'), polyfillPath('./d.d.ts'));
`
    )
  },

  ['with moduleOnly option set to false'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js",
        "./bar/": "./lib/bar/"
      }
    }`)

    assert.equal(
      polyfillPackage(pkgDir, { moduleOnly: false }),
`#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

function polyfillPath(posixPath) {
  return path.join(posixPath.split(path.posix.sep));
}

fs.symlinkSync(polyfillPath('./lib/foo.js'), polyfillPath('./foo.js'));
fs.symlinkSync(polyfillPath('./lib/bar'), polyfillPath('./bar'));
`
    )
  },
}
