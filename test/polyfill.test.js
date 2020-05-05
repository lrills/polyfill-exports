import fs from 'fs'
import assert from 'assert'
import polyfill from '../polyfill.js'

export default {
  ['first time polyfill'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js",
        "./bar/": "./lib/bar/"
      }
    }`)
    fs.mkdirSync(`${pkgDir}/lib/bar/`, { recursive: true })

    const result = polyfill(pkgDir)

    assert.deepEqual(Object.fromEntries(result), {
      './foo.js': './lib/foo.js',
      './bar': './lib/bar/',
    })

    assert.equal(
      fs.readFileSync(`${pkgDir}/foo.js`, { encoding: 'utf8' }),
      `module.exports = require('./lib/foo.js');\n`
    )

    assert.equal(fs.readlinkSync(`${pkgDir}/bar`), `./lib/bar`)
  },

  ['polyfill when duplicated file exist'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js",
        "./bar/": "./lib/bar/"
      }
    }`)
    fs.writeFileSync(`${pkgDir}/foo.js`, 'module.exports=...')
    fs.mkdirSync(`${pkgDir}/lib/bar/`, { recursive: true })
    fs.symlinkSync(`${pkgDir}/lib/bar/`, `${pkgDir}/bar`)

    const result = polyfill(pkgDir)

    assert.deepEqual(Object.fromEntries(result), {
      './foo.js': './lib/foo.js',
      './bar': './lib/bar/',
    })

    assert.equal(
      fs.readFileSync(`${pkgDir}/foo.js`, { encoding: 'utf8' }),
      `module.exports = require('./lib/foo.js');\n`
    )

    assert.equal(fs.readlinkSync(`${pkgDir}/bar`), `./lib/bar`)
  },

  ['throw if folder symlink name conflict'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo/": "./lib/foo/"
      }
    }`)
    fs.writeFileSync(`${pkgDir}/foo`, '...')

    assert.throws(
      () => polyfill(pkgDir),
      { message: `file ${pkgDir}/foo already exist` }
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

    const result = polyfill(pkgDir)

    assert.deepEqual(result, [['./foo.js', './lib/foo.js']])
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

    fs.mkdirSync(`${pkgDir}/lib/baz/`, { recursive: true })

    const result = polyfill(pkgDir)

    assert.deepEqual(Object.fromEntries(result), {
      './foo.js': './lib/foo.cjs',
      './bar.js': './lib/bar.js',
      './baz.js': './lib/baz.js',
    })

    assert.equal(
      fs.readFileSync(`${pkgDir}/foo.js`, { encoding: 'utf8' }),
      `module.exports = require('./lib/foo.cjs');\n`
    )

    assert.equal(
      fs.readFileSync(`${pkgDir}/bar.js`, { encoding: 'utf8' }),
      `module.exports = require('./lib/bar.js');\n`
    )

    assert.equal(
      fs.readFileSync(`${pkgDir}/baz.js`, { encoding: 'utf8' }),
      `module.exports = require('./lib/baz.js');\n`
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
    fs.mkdirSync(`${pkgDir}/lib/really/deep/baz/`, { recursive: true })

    const result = polyfill(pkgDir)

    assert.deepEqual(Object.fromEntries(result), {
      './deep/foo.js': './lib/deep/foo.js',
      './really/deep/bar.js': './lib/really/deep/bar.js',
      './really/deep/baz': './lib/really/deep/baz/',
    })

    assert.equal(
      fs.readFileSync(`${pkgDir}/deep/foo.js`, { encoding: 'utf8' }),
      `module.exports = require('../lib/deep/foo.js');\n`
    )

    assert.equal(
      fs.readFileSync(`${pkgDir}/really/deep/bar.js`, { encoding: 'utf8' }),
      `module.exports = require('../../lib/really/deep/bar.js');\n`
    )

    assert.equal(
      fs.readlinkSync(`${pkgDir}/really/deep/baz`),
      `../../lib/really/deep/baz`
    )
  },

  ['use ./subpath/index.js if there is other path exports under ./subpath'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./a": "./lib/a/index.js",
        "./a/b": "./lib/a/b/index.js",
        "./a/b/c": "./lib/a/b/c.js",
        "./a/b/d/": "./lib/a/b/d/"
      }
    }`)
    fs.mkdirSync(`${pkgDir}/lib/a/b/d/`, { recursive: true })

    const result = polyfill(pkgDir)

    assert.deepEqual(Object.fromEntries(result), {
      './a/index.js': './lib/a/index.js',
      './a/b/index.js': './lib/a/b/index.js',
      './a/b/c.js': './lib/a/b/c.js',
      './a/b/d': './lib/a/b/d/'
    })
  },
}
