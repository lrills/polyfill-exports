import fs from 'fs';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { resolve as resolvePath, dirname } from 'path';
import { execSync } from 'child_process';
import assertEqualDiff from './assertEqualDiff.js';

const __cli = resolvePath(dirname(fileURLToPath(import.meta.url)), '../cli.js');

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
`;

export default {
  ['create "polyfill-exports" script'](pkgDir) {
    fs.writeFileSync(
      `${pkgDir}/package.json`,
      `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js"
      }
    }`
    );

    execSync(`node ${__cli}`, { cwd: pkgDir });

    assertEqualDiff(
      `${expectedScriptHead}
fs.writeFileSync(polyfillPath('./foo.js'), 'module.exports=require("./lib/foo.js");\\n');
`,
      fs.readFileSync(`${pkgDir}/polyfill-exports.js`, { encoding: 'utf8' })
    );

    assert.equal(
      0o775,
      fs.statSync(`${pkgDir}/polyfill-exports.js`).mode & 0o7777
    );
  },

  ['create nothing if no subpath exports'](pkgDir) {
    fs.writeFileSync(
      `${pkgDir}/package.json`,
      `{
      "name": "polyfill-exports-testing",
      "exports": {
        ".": "./lib/index.js"
      }
    }`
    );

    execSync(`node ${__cli}`, { cwd: pkgDir });

    assert.throws(() => fs.statSync(`${pkgDir}/polyfill-exports.js`), /ENOENT/);
  },

  ['create script at the path specified with "--file"'](pkgDir) {
    fs.writeFileSync(
      `${pkgDir}/package.json`,
      `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js"
      }
    }`
    );
    fs.mkdirSync(`${pkgDir}/scripts`);

    execSync(`node ${__cli} --file scripts/polyfill.js`, { cwd: pkgDir });

    assertEqualDiff(
      `${expectedScriptHead}
fs.writeFileSync(polyfillPath('./foo.js'), 'module.exports=require("./lib/foo.js");\\n');
`,
      fs.readFileSync(`${pkgDir}/scripts/polyfill.js`, { encoding: 'utf8' })
    );
  },

  ['take the first arg as package path'](pkgDir) {
    fs.writeFileSync(
      `${pkgDir}/package.json`,
      `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js"
      }
    }`
    );

    execSync(`node ${__cli} ${pkgDir}`);

    assertEqualDiff(
      `${expectedScriptHead}
fs.writeFileSync(polyfillPath('./foo.js'), 'module.exports=require("./lib/foo.js");\\n');
`,
      fs.readFileSync(`${pkgDir}/polyfill-exports.js`, { encoding: 'utf8' })
    );
  },

  ['create .d.ts file if --ts-declaration flag is true'](pkgDir) {
    fs.writeFileSync(
      `${pkgDir}/package.json`,
      `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js"
      }
    }`
    );

    execSync(`node ${__cli} ${pkgDir} --ts-declaration`);

    assertEqualDiff(
      `${expectedScriptHead}
fs.writeFileSync(polyfillPath('./foo.js'), 'module.exports=require("./lib/foo.js");\\n');
fs.writeFileSync(polyfillPath('./foo.d.ts'), 'export { default } from "./lib/foo";\\nexport * from "./lib/foo";\\n');
`,
      fs.readFileSync(`${pkgDir}/polyfill-exports.js`, { encoding: 'utf8' })
    );
  },

  ['do not check is module when --module-only flag is false'](pkgDir) {
    fs.writeFileSync(
      `${pkgDir}/package.json`,
      `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js"
      }
    }`
    );

    execSync(`node ${__cli} ${pkgDir} --module-only=false`);

    assertEqualDiff(
      `#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

function polyfillPath(posixPath) {
  return path.join.apply(null, posixPath.split(path.posix.sep));
}

fs.writeFileSync(polyfillPath('./foo.js'), 'module.exports=require("./lib/foo.js");\\n');
`,
      fs.readFileSync(`${pkgDir}/polyfill-exports.js`, { encoding: 'utf8' })
    );
  },

  ['delete the script if "--delete" flag is true'](pkgDir) {
    fs.writeFileSync(
      `${pkgDir}/package.json`,
      `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js"
      }
    }`
    );
    fs.writeFileSync(
      `${pkgDir}/polyfill-exports.js`,
      `#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

function polyfillPath(posixPath) {
  return path.join.apply(null, posixPath.split(path.posix.sep));
}

fs.writeFileSync(polyfillPath('./foo.js'), 'module.exports=require("./lib/foo.js");\\n');
`
    );

    execSync(`node ${__cli} --delete`, { cwd: pkgDir });

    assert.throws(() => fs.statSync(`${pkgDir}/polyfill-exports.js`), /ENOENT/);
  },

  ['delete with "--file" specified'](pkgDir) {
    fs.writeFileSync(
      `${pkgDir}/package.json`,
      `{
      "name": "polyfill-exports-testing",
      "exports": {
        "./foo": "./lib/foo.js"
      }
    }`
    );
    fs.writeFileSync(
      `${pkgDir}/my-poly-script`,
      `${expectedScriptHead}
fs.writeFileSync(polyfillPath('./foo.js'), 'module.exports=require("./lib/foo.js");\\n');
`
    );

    execSync(`node ${__cli} --delete --file my-poly-script`, { cwd: pkgDir });

    assert.throws(() => fs.statSync(`${pkgDir}/my-poly-script`), /ENOENT/);
  },
};
