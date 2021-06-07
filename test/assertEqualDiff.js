import assert from 'assert'
import { diffStringsUnified } from 'jest-diff'

const assertEqualDiff = (a, b) => {
  assert.equal(a, b, diffStringsUnified(a, b))
}

export default assertEqualDiff