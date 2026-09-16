/**
 * Multi-supplier behaviour.
 *
 * Only one catalog ships today, so none of this is visible yet. These tests
 * register a second one in memory and check what happens when it is -- both
 * that the supplier question appears and narrows correctly, and that with a
 * single catalog it stays completely out of the way.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { CATALOGS } from '../src/data/catalogs/index.js'
import { getPartType } from '../src/data/partTypes/index.js'
import { buildCascade, cascadeFor, selectionAfter, nextAlongCascade } from '../src/views/drawerMap/dmCascade.js'

/** A second supplier selling overlapping sizes, including a colliding SKU. */
const WURTH = [
  { sku: '1092448', title: 'Hex nut M3', partType: 'nut', headType: 'nut',
    variant: 'nut-hex-thin', thread: 'M3', shape: { nutShape: 'hex', locking: 'none' } },
  { sku: 'W-M4-NUT', title: 'Hex nut M4', partType: 'nut', headType: 'nut',
    variant: 'nut-hex-thin', thread: 'M4', shape: { nutShape: 'hex', locking: 'none' } },
  { sku: 'W-M3-8',   title: 'Socket screw M3x8', partType: 'screw', headType: 'socket',
    thread: 'M3', length: 8, drive: 'Hex' },
  { sku: 'W-M3-10',  title: 'Socket screw M3x10', partType: 'screw', headType: 'socket',
    thread: 'M3', length: 10, drive: 'Hex' },
]

function withSecondSupplier(fn) {
  CATALOGS.wurth = { id: 'wurth', brand: 'Würth', skuLabel: 'Würth Art.', barcode: 'CODE128', parts: WURTH }
  try { return fn() } finally { delete CATALOGS.wurth }
}

test('supplier is asked only when a type has more than one seller', () => {
  // Two catalogs ship now, so the step exists in principle for every type...
  assert.deepEqual(cascadeFor(getPartType('nut')), ['supplier', 'variant', 'thread'])

  // ...but only Motedis sells T-slot nuts, so there is no question to ask and
  // the step resolves silently rather than offering a dropdown of one.
  const tnut = buildCascade({ typeId: 't-slot-nut' })
  assert.notEqual(tnut.steps[0].key, 'supplier')
  assert.equal(tnut.resolved.supplier, 'motedis')
})

test('with two catalogs supplier is asked first', () => {
  withSecondSupplier(() => {
    assert.deepEqual(cascadeFor(getPartType('nut')), ['supplier', 'variant', 'thread'])

    const first = buildCascade({ typeId: 'nut' })
    assert.equal(first.steps[0].key, 'supplier')
    assert.deepEqual(first.steps[0].options.map(o => o.value).sort(), ['bossard', 'wurth'])
    assert.deepEqual(
      first.steps[0].options.map(o => o.label).sort(),
      ['Bossard', 'Würth'],
      'suppliers are shown by brand, not by registry id')
  })
})

test('choosing a supplier narrows everything after it', () => {
  withSecondSupplier(() => {
    const wurth = buildCascade({ typeId: 'nut', selection: { supplier: 'wurth' } })
    const variants = wurth.steps.find(s => s.key === 'variant')
    // Würth only sells thin hex nuts here, so the variant step resolves away.
    assert.equal(variants, undefined, 'a single remaining variant resolves silently')

    const threads = wurth.steps.find(s => s.key === 'thread')
    assert.deepEqual(threads.options.map(o => o.value), ['M3', 'M4'],
      'only the threads the second supplier sells are offered')
  })
})

test('a colliding SKU resolves to the right supplier', () => {
  withSecondSupplier(() => {
    // Both catalogs have a part numbered 1092448. Identity is the pair, so the
    // cascade must return exactly one match, from the chosen supplier.
    const result = buildCascade({
      typeId: 'nut',
      selection: { supplier: 'wurth', variant: 'nut-hex-thin', thread: 'M3' },
    })
    assert.ok(result.complete)
    assert.deepEqual(result.matches.map(m => m.sku), ['1092448'])
    assert.deepEqual(result.matches.map(m => m.supplier), ['wurth'],
      'the Bossard part with the same number must not be matched')
  })
})

test('changing supplier clears the answers under it', () => {
  withSecondSupplier(() => {
    const full = { _binId: 'b1', type: 'nut', supplier: 'bossard', variant: 'nut-square', thread: 'M3' }
    assert.deepEqual(
      selectionAfter(full, 'nut', 'supplier', 'wurth'),
      { _binId: 'b1', type: 'nut', supplier: 'wurth' },
      'a variant or thread from the old supplier may not exist in the new one')
  })
})

test('duplicating a bin stays with its supplier', () => {
  withSecondSupplier(() => {
    const next = nextAlongCascade({ ...WURTH[2], supplier: 'wurth' })
    assert.ok(next, 'there is a longer screw in the same range')
    assert.equal(next.sku, 'W-M3-10')
    assert.equal(next.supplier, 'wurth', 'stepping must not cross into another catalog')
  })
})
