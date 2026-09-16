/**
 * Golden output test.
 *
 * Asserts that the description text, order-list density and every silhouette
 * are byte-identical to the committed snapshot for a frozen slice of the
 * catalog. This is what makes the Phase 1 refactor safe to merge: moving
 * descriptions, densities and shape dispatch into part type modules must not
 * change a single character of what a user sees.
 *
 * If this fails after a refactor, the refactor is wrong.
 * If it fails after a deliberate change, run `npm run test:golden:update` and
 * review the diff.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { computeGolden } from './compute-golden.mjs'

const SNAPSHOT = join(dirname(fileURLToPath(import.meta.url)), 'golden.snapshot.json')
const expected = JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
const actual   = computeGolden()

test('snapshot covers the same fixtures', () => {
  assert.deepEqual(
    actual.map(r => r.sku),
    expected.map(r => r.sku),
    'Fixture set changed. If that was deliberate, run `npm run test:golden:update`.',
  )
})

// One test per fixture per field, so a failure names exactly what drifted
// rather than dumping 43 records of diff.
const FIELDS = ['describe', 'shortLabel', 'part', 'density', 'svg', 'svgLabel', 'svgLabelTop', 'svgLabelReduced']

for (const [i, exp] of expected.entries()) {
  const act = actual[i]
  if (!act) continue

  test(`${exp.sku} (${exp.why})`, async t => {
    for (const field of FIELDS) {
      await t.test(field, () => {
        assert.deepEqual(act[field], exp[field])
      })
    }
  })
}
