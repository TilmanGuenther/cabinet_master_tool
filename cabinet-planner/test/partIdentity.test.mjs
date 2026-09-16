/**
 * Part identity: supplier-scoped SKUs, and reading configs written before
 * Phase 4 that only carry `bossardPN`.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { partIdentity, partSku, skuLabel, barcodeValue, catalogFor } from '../src/utils/partIdentity.js'
import { dbEntryToPart } from '../src/views/drawerMap/dmHelpers.js'
import { allParts, CATALOGS } from '../src/data/catalogs/index.js'

test('a modern part record identifies its supplier and sku', () => {
  assert.deepEqual(
    partIdentity({ supplier: 'bossard', sku: '1092448' }),
    { supplier: 'bossard', sku: '1092448' })
})

test('a legacy record with only bossardPN reads as a Bossard part', () => {
  assert.deepEqual(
    partIdentity({ bossardPN: '1092448' }),
    { supplier: 'bossard', sku: '1092448' },
    'configs written before Phase 4 must keep working without migration')
  assert.equal(partSku({ bossardPN: '1092448' }), '1092448')
})

test('a part with no sku has no identity', () => {
  assert.equal(partIdentity({ thread: 'M3' }), null)
  assert.equal(partIdentity(null), null)
  assert.equal(partSku({}), '')
})

test('sku and supplier win over the deprecated alias', () => {
  const part = { supplier: 'bossard', sku: 'NEW', bossardPN: 'OLD' }
  assert.equal(partSku(part), 'NEW')
})

test('an unknown supplier falls back to the default catalog', () => {
  const part = { supplier: 'nonexistent-supplier', sku: 'X' }
  assert.equal(catalogFor(part).id, 'bossard')
})

test('labels and barcodes come from the supplier', () => {
  const part = { supplier: 'bossard', sku: '1092448' }
  assert.equal(skuLabel(part), 'Bossard PN')
  assert.equal(barcodeValue(part), '1092448')
})

test('a supplier with no barcode format yields no barcode', () => {
  const original = CATALOGS.bossard.barcode
  try {
    CATALOGS.bossard.barcode = null
    assert.equal(barcodeValue({ supplier: 'bossard', sku: '1092448' }), '',
      'a supplier whose numbers are not scannable should print no barcode')
  } finally {
    CATALOGS.bossard.barcode = original
  }
})

test('assigning a part writes both the neutral fields and the deprecated aliases', () => {
  const entry = allParts().find(e => e.partType === 'nut' && e.variant)
  const part = dbEntryToPart(entry)

  assert.equal(part.supplier, 'bossard')
  assert.equal(part.sku, entry.sku)
  assert.equal(part.catalogRef, entry.catalogRef)
  assert.equal(part.partType, entry.partType)
  assert.equal(part.variant, entry.variant)
  assert.deepEqual(part.shape, entry.shape)

  // Kept for one release so older builds can still read new configs.
  assert.equal(part.bossardPN, entry.sku)
  assert.equal(part.bossardNorm, entry.catalogRef)

  // And the record round-trips through the identity helper.
  assert.deepEqual(partIdentity(part), { supplier: 'bossard', sku: entry.sku })
})

test('every catalog entry produces a part with a resolvable identity', () => {
  for (const entry of allParts()) {
    const id = partIdentity(dbEntryToPart(entry))
    assert.ok(id, `${entry.sku} produced a part with no identity`)
    assert.equal(id.supplier, 'bossard')
  }
})
