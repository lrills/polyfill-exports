import fs from 'fs'
import os from 'os'
import path from 'path'
import assert from 'assert'
import polyfill from './index.js'

const tempDirname = fs.mkdtempSync(path.join(os.tmpdir(), 'sep-test-'))

fs.writeFileSync(`${tempDirname}/package.json`, `{
  "name": "subpath-exports-polyfill-testing",
  "main": "./lib/index.js",
  "exports": {
    ".": "./lib/index.js",
    "./foo": "./lib/foo.js",
    "./bar": {
      "import": "./lib/bar.mjs",
      "require": "./lib/bar.cjs"
    },
    "./baz/": "./lib/baz/"
  }
}`)

fs.mkdirSync(`${tempDirname}/lib/baz/`, { recursive: true })

const result = polyfill(tempDirname)

assert.deepEqual(result, [
  ['./foo.js', './lib/foo.js'],
  ['./bar.js', './lib/bar.cjs'],
  ['./baz', './lib/baz/'],
])

assert.equal(
  fs.readFileSync(`${tempDirname}/foo.js`, { encoding: 'utf8' }),
  `module.exports = require('./lib/foo.js');\n`
)

assert.equal(
  fs.readFileSync(`${tempDirname}/bar.js`, { encoding: 'utf8' }),
  `module.exports = require('./lib/bar.cjs');\n`
)

assert.equal(
  fs.readlinkSync(`${tempDirname}/baz`),
  `${tempDirname}/lib/baz/`
)

console.log('Ok!')
