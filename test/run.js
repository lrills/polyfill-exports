import os from 'os'
import fs from 'fs'
import url from 'url';
import path from 'path'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exports-polyfill-test-'))

const runTests = ({ default: tests }) => {
  for (const [name, testFn] of Object.entries(tests)) {
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
  }
}

const testDir = path.dirname(url.fileURLToPath(import.meta.url))
const testSuites = fs.readdirSync(testDir).filter(f => f.match(/.test.js$/))

let testing = Promise.resolve()
for (const suite of testSuites) {
  testing = testing.then(() => import(`${testDir}/${suite}`)).then(runTests)
}
