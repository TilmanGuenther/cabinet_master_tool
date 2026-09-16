/**
 * Non-fastener part types, end to end.
 *
 * O-rings, springs and spacers have no thread, no head geometry and no length.
 * They exist to prove the two extension points actually work: a part type
 * declares its own dimensions, description, density and cascade, and nothing
 * in the views, the query layer or the renderers knows it is special.
 *
 * No o-ring catalog ships with the app -- supplying data is a contributor's
 * job -- so these tests register one in memory and drive the real code against
 * it, which is exactly the path a contributed catalog takes.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { CATALOGS } from '../src/data/catalogs/index.js'
import { getPartType, describePart, shortLabel, resolvePartType } from '../src/data/partTypes/index.js'
import { getDensity } from '../src/data/densities.js'
import { buildCascade, nextAlongCascade } from '../src/views/drawerMap/dmCascade.js'
import { dbEntryToPart } from '../src/views/drawerMap/dmHelpers.js'
import { validateCatalog } from '../src/data/catalogs/schema.js'

/** A small o-ring catalog in the normalized schema, as a contributor would write it. */
const ORINGS = [
  { sku: 'OR-10-2',   title: 'O-ring 10x2',   partType: 'o-ring', headType: 'o-ring',
    variant: 'oring-nbr70', innerD: 10, crossSection: 2, material: 'NBR' },
  { sku: 'OR-12-2',   title: 'O-ring 12x2',   partType: 'o-ring', headType: 'o-ring',
    variant: 'oring-nbr70', innerD: 12, crossSection: 2, material: 'NBR' },
  { sku: 'OR-10-2-V', title: 'O-ring 10x2 FKM', partType: 'o-ring', headType: 'o-ring',
    variant: 'oring-fkm', innerD: 10, crossSection: 2, material: 'FKM' },
  { sku: 'OR-10-3',   title: 'O-ring 10x3',   partType: 'o-ring', headType: 'o-ring',
    variant: 'oring-nbr70', innerD: 10, crossSection: 3, material: 'NBR' },
]

/** Register a catalog for the duration of one test. */
function withCatalog(id, parts, fn) {
  CATALOGS[id] = { id, brand: 'Test Seals', skuLabel: 'Seal No.', barcode: 'CODE128', parts }
  try { return fn() } finally { delete CATALOGS[id] }
}

test('a non-fastener catalog validates', () => {
  const { errors } = validateCatalog({ id: 'seals', parts: ORINGS })
  assert.deepEqual(errors, [], 'an o-ring with no thread and no length must be valid')
})

test('the validator still demands the dimensions an o-ring does need', () => {
  const { errors } = validateCatalog({ id: 'seals', parts: [
    { sku: 'BAD', title: 'O-ring', partType: 'o-ring', headType: 'o-ring', variant: 'oring-nbr70' },
  ]})
  const fields = errors.map(e => e.field).sort()
  assert.deepEqual(fields, ['crossSection', 'innerD'],
    'missing inner diameter and cross-section must both be errors')
})

test('an o-ring describes and labels itself without a thread', () => {
  const type = getPartType('o-ring')
  const entry = ORINGS[0]
  assert.equal(describePart(entry, type.variants[0].label), 'Ø10×2 NBR 70 Shore A')
  assert.equal(shortLabel(entry), 'Ø10×2 · O-Ring')
})

test('density comes from the torus model, and falls with cord size', () => {
  const small = getDensity(ORINGS[0])           // Ø10 x 2
  const big   = getDensity(ORINGS[3])           // Ø10 x 3
  assert.ok(small > 0, 'an o-ring must get a real density')
  assert.ok(small > big, 'a fatter cord means fewer per millilitre')

  // Sanity-check the magnitude against the torus formula, not just the ordering.
  const expected = 1000 / (2 * Math.PI ** 2 * ((10 + 2) / 2) * 1 ** 2 * 3.0)
  assert.ok(Math.abs(small - Math.round(expected * 10) / 10) < 0.2,
    `expected about ${expected.toFixed(2)} pcs/ml, got ${small}`)
})

test('the assigner cascade asks o-ring questions, not fastener ones', () => {
  withCatalog('seals', ORINGS, () => {
    const first = buildCascade({ typeId: 'o-ring' })
    assert.deepEqual(first.steps.map(s => s.key), ['variant'],
      'the cascade opens on variant, with no thread step in sight')

    const afterVariant = buildCascade({ typeId: 'o-ring', selection: { variant: 'oring-nbr70' } })
    assert.deepEqual(afterVariant.steps.map(s => s.key), ['variant', 'innerD'])
    assert.deepEqual(afterVariant.steps[1].options.map(o => o.value), [10, 12],
      'inner diameters are offered in numeric order')
    assert.equal(afterVariant.steps[1].label, 'Inner Ø')

    const complete = buildCascade({
      typeId: 'o-ring',
      selection: { variant: 'oring-nbr70', innerD: 10, crossSection: 2 },
    })
    assert.ok(complete.complete, 'answering every question resolves the part')
    assert.deepEqual(complete.matches.map(m => m.sku), ['OR-10-2'])
  })
})

test('dimension steps are always asked, even with one option', () => {
  withCatalog('seals', ORINGS, () => {
    // FKM has exactly one size here, but dimension fields are declared
    // autoResolve 'never' -- the same rule that keeps a single screw length
    // visible rather than silently chosen. So the step still appears.
    const open = buildCascade({ typeId: 'o-ring', selection: { variant: 'oring-fkm' } })
    assert.equal(open.complete, false, 'a single option is still offered, not assumed')
    assert.deepEqual(open.steps.map(s => s.key), ['variant', 'innerD'])

    const done = buildCascade({
      typeId: 'o-ring',
      selection: { variant: 'oring-fkm', innerD: 10, crossSection: 2 },
    })
    assert.ok(done.complete)
    assert.deepEqual(done.matches.map(m => m.sku), ['OR-10-2-V'])
  })
})

test('duplicating an o-ring steps along its cross-section', () => {
  withCatalog('seals', ORINGS, () => {
    // The last numeric field in the o-ring cascade is crossSection, so that is
    // what steps -- no code outside oring.js says so.
    const next = nextAlongCascade(ORINGS[0])
    assert.ok(next, 'there is a fatter cord in the same size')
    assert.equal(next.sku, 'OR-10-3')
    assert.equal(next.innerD, 10, 'stepping stays in the same inner diameter')
  })
})

test('an assigned o-ring becomes a valid part record', () => {
  withCatalog('seals', ORINGS, () => {
    const part = dbEntryToPart({ ...ORINGS[0], supplier: 'seals' })
    assert.equal(part.supplier, 'seals')
    assert.equal(part.sku, 'OR-10-2')
    assert.equal(part.partType, 'o-ring')
    assert.equal(resolvePartType(part).id, 'o-ring')
    assert.equal(part.thread, '', 'no thread, and nothing breaks')
    assert.equal(part.length, null)
  })
})

test('springs and spacers are sized by their own dimensions', () => {
  const spring = { partType: 'spring', headType: 'spring', outerD: 8, freeLength: 25, wireD: 1 }
  assert.equal(shortLabel(spring), 'Ø8×25 · Spring')
  assert.ok(getDensity(spring) > 0)

  const spacer = { partType: 'spacer', headType: 'spacer', outerD: 6, innerD: 3.2, length: 10 }
  assert.equal(shortLabel(spacer), 'Ø6/Ø3.2×10 · Spacer')

  // A spacer is a tube: only the wall counts, so a wider bore means less material
  // and more pieces per millilitre.
  const thinWall = getDensity({ ...spacer, innerD: 5 })
  assert.ok(thinWall > getDensity(spacer), 'a wider bore packs more pieces per ml')
})
