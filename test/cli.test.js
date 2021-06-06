import fs from 'fs'
import assert from 'assert'
import { fileURLToPath } from 'url'
import { resolve as resolvePath, dirname } from 'path'
import { execSync } from 'child_process'

const __cli = resolvePath(dirname(fileURLToPath(import.meta.url)), '../cli.js')


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
  ['create "polyfill-exports" script'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js"
      }
    }`)

    execSync(`node ${__cli}`, { cwd: pkgDir })

    assert.equal(
      fs.readFileSync(`${pkgDir}/polyfill-exports.js`, { encoding:'utf8' }),
`${expectedScriptHead}
fs.symlinkSync(polyfillPath('./lib/foo.js'), polyfillPath('./foo.js'));
`
    )

    assert.equal(
      fs.statSync(`${pkgDir}/polyfill-exports.js`).mode & 0o7777,
      0o775
    )
  },

  ['create nothing if no subpath exports'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        ".": "./lib/index.js"
      }
    }`)

    execSync(`node ${__cli}`, { cwd: pkgDir })

    assert.throws(() => fs.statSync(`${pkgDir}/polyfill-exports.js`), /ENOENT/)
  },

  ['create script at the path specified with "--file"'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js"
      }
    }`)
    fs.mkdirSync(`${pkgDir}/scripts`)

    execSync(`node ${__cli} --file scripts/polyfill.js`, { cwd: pkgDir })

    assert.equal(
      fs.readFileSync(`${pkgDir}/scripts/polyfill.js`, { encoding:'utf8' }),
`${expectedScriptHead}
fs.symlinkSync(polyfillPath('./lib/foo.js'), polyfillPath('./foo.js'));
`
    )
  },

  ['take the first arg as package path'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js"
      }
    }`)

    execSync(`node ${__cli} ${pkgDir}`)

    assert.equal(
      fs.readFileSync(`${pkgDir}/polyfill-exports.js`, { encoding:'utf8' }),
`${expectedScriptHead}
fs.symlinkSync(polyfillPath('./lib/foo.js'), polyfillPath('./foo.js'));
`
    )
  },

  ['create .d.ts file if --ts-declaration flag is true'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js"
      }
    }`)

    execSync(`node ${__cli} ${pkgDir} --ts-declaration`)

    assert.equal(
      fs.readFileSync(`${pkgDir}/polyfill-exports.js`, { encoding:'utf8' }),
`${expectedScriptHead}
fs.symlinkSync(polyfillPath('./lib/foo.js'), polyfillPath('./foo.js'));
fs.symlinkSync(polyfillPath('./lib/foo.d.ts'), polyfillPath('./foo.d.ts'));
`
    )
  },

  ['do not check is module when --module-only flag is false'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js"
      }
    }`)

    execSync(`node ${__cli} ${pkgDir} --module-only=false`)

    assert.equal(
      fs.readFileSync(`${pkgDir}/polyfill-exports.js`, { encoding:'utf8' }),
`#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

function polyfillPath(posixPath) {
  return path.join(posixPath.split(path.posix.sep));
}

fs.symlinkSync(polyfillPath('./lib/foo.js'), polyfillPath('./foo.js'));
`
    )
  },

  ['delete the script if "--delete" flag is true'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js"
      }
    }`)
    fs.writeFileSync(
      `${pkgDir}/polyfill-exports.js`,
`#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

function polyfillPath(posixPath) {
  return path.join(posixPath.split(path.posix.sep));
}

fs.symlinkSync(polyfillPath('./lib/foo.js'), polyfillPath('./foo.js'));
`
    )

    execSync(`node ${__cli} --delete`, { cwd: pkgDir })

    assert.throws(() => fs.statSync(`${pkgDir}/polyfill-exports.js`), /ENOENT/)
  },

  ['delete with "--file" specified'](pkgDir) {
    fs.writeFileSync(`${pkgDir}/package.json`, `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js"
      }
    }`)
    fs.writeFileSync(
      `${pkgDir}/my-poly-script`,
`${expectedScriptHead}
fs.symlinkSync(polyfillPath('./lib/foo.js'), polyfillPath('./foo.js'));
`
    )

    execSync(`node ${__cli} --delete --file my-poly-script`, { cwd: pkgDir })

    assert.throws(() => fs.statSync(`${pkgDir}/my-poly-script`), /ENOENT/)
  },
}
