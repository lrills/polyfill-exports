import fs from 'fs'
import assert from 'assert'
import clear from '../clear.js'

export default {
  ['remove all link files'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./a": "./lib/a/index.js",
        "./a/b": "./lib/a/b/index.js",
        "./a/b/c": "./lib/a/b/c.js",
        "./a/b/d/": "./lib/a/b/d/",
        "./a/e": "./lib/a/e.js",
        "./f": "./lib/f.js",
        "./g/": "./lib/g/"
      }
    }`)
    fs.mkdirSync(`${pkgDir}/lib/a/b/d/`, { recursive: true })
    fs.mkdirSync(`${pkgDir}/lib/g`)
    fs.mkdirSync(`${pkgDir}/a/b`, { recursive: true })

    fs.writeFileSync(`${pkgDir}/a/index.js`, 'module.exports = ...')
    fs.writeFileSync(`${pkgDir}/a/b/index.js`, 'module.exports = ...')
    fs.writeFileSync(`${pkgDir}/a/b/c.js`, 'module.exports = ...')
    fs.symlinkSync(`${pkgDir}/lib/a/b/d/`, `${pkgDir}/a/b/d`)
    fs.writeFileSync(`${pkgDir}/a/e.js`, 'module.exports = ...')
    fs.writeFileSync(`${pkgDir}/f.js`, 'module.exports = ...')
    fs.symlinkSync(`${pkgDir}/lib/g/`, `${pkgDir}/g`)

    const result = clear(pkgDir)

    assert.deepEqual(result.sort(), [
      './a/b/c.js',
      './a/b/d',
      './a/b/index.js',
      './a/e.js',
      './a/index.js',
      './f.js',
      './g',
    ])

    assert.throws(
      () => fs.lstatSync(`${pkgDir}/a`),
      new RegExp(
        `^Error: ENOENT: no such file or directory, lstat '${pkgDir}/a'$`
      )
    )

    assert.throws(
      () => fs.lstatSync(`${pkgDir}/f.js`),
      new RegExp(
        `^Error: ENOENT: no such file or directory, lstat '${pkgDir}/f.js'$`
      )
    )

    assert.throws(
      () => fs.lstatSync(`${pkgDir}/g`),
      new RegExp(
        `^Error: ENOENT: no such file or directory, lstat '${pkgDir}/g'$`
      )
    )
  },

  ['return empty array if no subpath exports'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        ".": "./lib/index.js"
      }
    }`)

    assert.deepEqual(clear(pkgDir), [])
  },

  ['return only existed files'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./a": "./lib/a/index.js",
        "./a/b": "./lib/a/b/index.js",
        "./a/b/c": "./lib/a/b/c.js",
        "./a/b/d/": "./lib/a/b/d/",
        "./a/e": "./lib/a/e.js",
        "./f": "./lib/f.js",
        "./g/": "./lib/g/"
      }
    }`)
    fs.mkdirSync(`${pkgDir}/lib/g`, { recursive: true })
    fs.mkdirSync(`${pkgDir}/a/b`, { recursive: true })

    fs.writeFileSync(`${pkgDir}/a/b/index.js`, 'module.exports = ...')
    fs.symlinkSync(`${pkgDir}/lib/g/`, `${pkgDir}/g`)

    const result = clear(pkgDir)

    assert.deepEqual(result.sort(), [
      './a/b/index.js',
      './g',
    ])

    assert.throws(
      () => fs.lstatSync(`${pkgDir}/a`),
      new RegExp(
        `^Error: ENOENT: no such file or directory, lstat '${pkgDir}/a'$`
      )
    )

    assert.throws(
      () => fs.lstatSync(`${pkgDir}/g`),
      new RegExp(
        `^Error: ENOENT: no such file or directory, lstat '${pkgDir}/g'$`
      )
    )
  }
}
