import fs from 'fs'
import os from 'os'
import path from 'path'
import assert from 'assert'
import polyfill from './index.js'

const tests = {
  ['first time polyfill'](pkgDirname) {
    fs.writeFileSync(`${pkgDirname}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js",
        "./bar/": "./lib/bar/"
      }
    }`)
    fs.mkdirSync(`${pkgDirname}/lib/bar/`, { recursive: true })

    const result = polyfill(pkgDirname)

    assert.deepEqual(Object.fromEntries(result), {
      './foo.js': './lib/foo.js',
      './bar': './lib/bar/',
    })

    assert.equal(
      fs.readFileSync(`${pkgDirname}/foo.js`, { encoding: 'utf8' }),
      `module.exports = require('./lib/foo.js');\n`
    )

    assert.equal(fs.readlinkSync(`${pkgDirname}/bar`), `./lib/bar`)
  },

  ['polyfill when duplicated file exist'](pkgDirname) {
    fs.writeFileSync(`${pkgDirname}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js",
        "./bar/": "./lib/bar/"
      }
    }`)
    fs.writeFileSync(`${pkgDirname}/foo.js`, 'module.exports=...')
    fs.mkdirSync(`${pkgDirname}/lib/bar/`, { recursive: true })
    fs.symlinkSync(`${pkgDirname}/lib/bar/`, `${pkgDirname}/bar`)

    const result = polyfill(pkgDirname)

    assert.deepEqual(Object.fromEntries(result), {
      './foo.js': './lib/foo.js',
      './bar': './lib/bar/',
    })

    assert.equal(
      fs.readFileSync(`${pkgDirname}/foo.js`, { encoding: 'utf8' }),
      `module.exports = require('./lib/foo.js');\n`
    )

    assert.equal(fs.readlinkSync(`${pkgDirname}/bar`), `./lib/bar`)
  },

  ['throw if folder symlink name conflict'](pkgDirname) {
    fs.writeFileSync(`${pkgDirname}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo/": "./lib/foo/"
      }
    }`)
    fs.writeFileSync(`${pkgDirname}/foo`, '...')

    assert.throws(
      () => polyfill(pkgDirname),
      { message: `file ${pkgDirname}/foo already exist` }
    )
  },

  ['ignore "."'](pkgDirname) {
    fs.writeFileSync(`${pkgDirname}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        ".": "./lib/index.js",
        "./foo": "./lib/foo.js"
      }
    }`)

    const result = polyfill(pkgDirname)

    assert.deepEqual(result, [['./foo.js', './lib/foo.js']])
  },

  ['conditional export order'](pkgDirname) {
    fs.writeFileSync(`${pkgDirname}/package.json`, `{
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

    fs.mkdirSync(`${pkgDirname}/lib/baz/`, { recursive: true })

    const result = polyfill(pkgDirname)

    assert.deepEqual(Object.fromEntries(result), {
      './foo.js': './lib/foo.cjs',
      './bar.js': './lib/bar.js',
      './baz.js': './lib/baz.js',
    })

    assert.equal(
      fs.readFileSync(`${pkgDirname}/foo.js`, { encoding: 'utf8' }),
      `module.exports = require('./lib/foo.cjs');\n`
    )

    assert.equal(
      fs.readFileSync(`${pkgDirname}/bar.js`, { encoding: 'utf8' }),
      `module.exports = require('./lib/bar.js');\n`
    )

    assert.equal(
      fs.readFileSync(`${pkgDirname}/baz.js`, { encoding: 'utf8' }),
      `module.exports = require('./lib/baz.js');\n`
    )
  },

  ['handle non-shallow path'](pkgDirname) {
    fs.writeFileSync(`${pkgDirname}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./deep/foo": "./lib/deep/foo.js",
        "./really/deep/bar": "./lib/really/deep/bar.js",
        "./really/deep/baz/": "./lib/really/deep/baz/"
      }
    }`)
    fs.mkdirSync(`${pkgDirname}/lib/really/deep/baz/`, { recursive: true })

    const result = polyfill(pkgDirname)

    assert.deepEqual(Object.fromEntries(result), {
      './deep/foo.js': './lib/deep/foo.js',
      './really/deep/bar.js': './lib/really/deep/bar.js',
      './really/deep/baz': './lib/really/deep/baz/',
    })

    assert.equal(
      fs.readFileSync(`${pkgDirname}/deep/foo.js`, { encoding: 'utf8' }),
      `module.exports = require('../lib/deep/foo.js');\n`
    )

    assert.equal(
      fs.readFileSync(`${pkgDirname}/really/deep/bar.js`, { encoding: 'utf8' }),
      `module.exports = require('../../lib/really/deep/bar.js');\n`
    )

    assert.equal(
      fs.readlinkSync(`${pkgDirname}/really/deep/baz`),
      `../../lib/really/deep/baz`
    )
  },

  ['use ./subpath/index.js if there is other path exports under ./subpath'](pkgDirname) {
    fs.writeFileSync(`${pkgDirname}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./a": "./lib/a/index.js",
        "./a/b": "./lib/a/b/index.js",
        "./a/b/c": "./lib/a/b/c.js",
        "./a/b/d/": "./lib/a/b/d/"
      }
    }`)
    fs.mkdirSync(`${pkgDirname}/lib/a/b/d/`, { recursive: true })

    const result = polyfill(pkgDirname)

    assert.deepEqual(Object.fromEntries(result), {
      './a/index.js': './lib/a/index.js',
      './a/b/index.js': './lib/a/b/index.js',
      './a/b/c.js': './lib/a/b/c.js',
      './a/b/d': './lib/a/b/d/'
    })
  },
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exports-polyfill-test-'))

Object.entries(tests).forEach(([name, testFn]) => {
  for (const f of fs.readdirSync(tmpDir)) {
    const tmpFile = `${tmpDir}/${f}`
    if (fs.lstatSync(tmpFile).isDirectory()) {
      fs.rmdirSync(tmpFile, { recursive: true })
    } else {
      fs.unlinkSync(tmpFile)
    }
  }

  try {
    testFn(tmpDir)
    console.log(`✅  ${name}`)
  } catch (err) {
    console.log(`❌  ${name}\n`)
    console.error(err)
  }
})
