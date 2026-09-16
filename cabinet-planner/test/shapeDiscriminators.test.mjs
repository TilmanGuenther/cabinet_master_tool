/**
 * Shape discriminators.
 *
 * How a part is drawn used to be guessed from Bossard norm numbers and German
 * title text. Catalogs now state it outright in `variant` and `shape`, with the
 * old guess kept only as a fallback for part records written before those
 * fields existed.
 *
 * Two things must hold: the fallback still reproduces the old behaviour, and a
 * catalog in another language now draws correctly where it previously could not.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { isSquareNut, isMFStandoff, isNylocNut, washerDims } from '../src/utils/partDims.js'
import { allParts } from '../src/data/catalogs/index.js'
import { dbEntryToPart } from '../src/views/drawerMap/dmHelpers.js'

const parts = allParts().map(dbEntryToPart)
const drop = (part, ...keys) => {
  const copy = { ...part }
  for (const k of keys) delete copy[k]
  return copy
}

test('explicit fields agree with the legacy guess on the whole catalog', () => {
  // This is what made the switch safe: on real data the two never disagree, so
  // nothing a user sees could move.
  for (const part of parts) {
    const legacy = drop(part, 'shape', 'variant')
    assert.equal(isSquareNut(part),  isSquareNut(legacy),  `${part.sku} square-nut`)
    assert.equal(isMFStandoff(part), isMFStandoff(legacy), `${part.sku} standoff ends`)
    assert.equal(isNylocNut(part),   isNylocNut(legacy),   `${part.sku} nyloc`)
    assert.deepEqual(washerDims(part), washerDims(legacy), `${part.sku} washer dims`)
  }
})

test('an English-language catalog is drawn correctly', () => {
  // The exact case the old sniffing got wrong: no German title, no BN norm.
  const squareNut = {
    partType: 'nut', headType: 'nut', thread: 'M4',
    title: 'Square nuts', description: 'M4 Square Nut',
    shape: { nutShape: 'square', locking: 'none' },
  }
  assert.equal(isSquareNut(squareNut), true,
    'a square nut with no German title must still be drawn square')

  const nyloc = {
    partType: 'nut', headType: 'nut', thread: 'M4',
    title: 'Prevailing torque hex nuts', description: 'M4 Lock Nut',
    shape: { nutShape: 'hex', locking: 'nylon' },
  }
  assert.equal(isNylocNut(nyloc), true,
    'a nylon insert nut must be drawn taller even when nothing says "nyloc"')

  const mfStandoff = {
    partType: 'standoff', headType: 'standoff', thread: 'M3', length: 10,
    title: 'Hex standoffs, male-female',
    shape: { standoffEnds: 'mf' },
  }
  assert.equal(isMFStandoff(mfStandoff), true,
    'a male-female standoff must get its stud without the word "Aussengewinde"')

  const largeWasher = { partType: 'washer', headType: 'washer', thread: 'M4', variant: 'washer-large' }
  assert.equal(washerDims(largeWasher).outerD, 16, 'DIN 9021 large washer: OD = 4d')
  assert.equal(washerDims({ ...largeWasher, variant: 'washer-std' }).outerD, 9, 'DIN 125: OD = 2.25d')
})

test('the same parts drawn without explicit fields fall back to the old guess', () => {
  // An English catalog that omits `shape` gets the old, wrong answer -- which is
  // why the validator warns about it rather than staying silent.
  const englishSquareNut = { partType: 'nut', headType: 'nut', thread: 'M4', title: 'Square nuts' }
  assert.equal(isSquareNut(englishSquareNut), false,
    'without shape there is nothing to go on, and the validator warns for exactly this reason')
})
