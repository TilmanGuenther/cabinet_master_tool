/**
 * Part assigner cascade tests.
 *
 * Walks every reachable combination of answers for every part type against the
 * real catalog and snapshots the result. Update with
 * `npm run test:golden:update` and read the diff.
 *
 * Until Phase 3.4 this also checked equivalence against cascade-reference.mjs,
 * a frozen copy of the pre-Phase-2 cascade. That reference was retired with 3.4
 * as planned: entries now carry `variant` directly, so the norm-matching it
 * encoded is deliberately gone. The snapshot below took over its job.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PART_TYPES } from '../src/data/partTypes/index.js'
import { allParts } from '../src/data/catalogs/index.js'
import { buildCascade, selectionAfter, coerceFieldValue, nextAlongCascade } from '../src/views/drawerMap/dmCascade.js'
import { walkCascade, summarize } from './cascade-walk.mjs'

const SNAPSHOT = join(dirname(fileURLToPath(import.meta.url)), 'cascade.snapshot.json')

const db = allParts()
const states = walkCascade()

test('walk reaches every part type', () => {
  const seen = new Set(states.map(s => s.typeId))
  assert.deepEqual([...seen].sort(), Object.keys(PART_TYPES).sort())
})

test('cascade snapshot', () => {
  const expected = JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
  const actual = states.map(({ typeId, selection }) => ({
    typeId,
    selection,
    result: summarize(buildCascade({ typeId, selection })),
  }))
  assert.equal(actual.length, expected.length, 'number of reachable cascade states changed')
  for (const [i, exp] of expected.entries()) {
    assert.deepEqual(actual[i], exp,
      `cascade changed at ${exp.typeId} ${JSON.stringify(exp.selection)}`)
  }
})

// ── Selection bookkeeping ─────────────────────────────────────────────────────

test('answering a step drops the answers after it', () => {
  // screw cascade: thread > headType > drive > length
  const full = { _binId: 'b1', type: 'screw', thread: 'M3', headType: 'socket', drive: 'Hex', length: 8, matchPN: '123' }

  assert.deepEqual(
    selectionAfter(full, 'screw', 'thread', 'M4'),
    { _binId: 'b1', type: 'screw', thread: 'M4' },
    'changing the first step clears everything downstream')

  assert.deepEqual(
    selectionAfter(full, 'screw', 'drive', 'Torx'),
    { _binId: 'b1', type: 'screw', thread: 'M3', headType: 'socket', drive: 'Torx' },
    'changing a middle step keeps upstream answers and drops length and matchPN')

  assert.deepEqual(
    selectionAfter(full, 'screw', 'length', '12'),
    { _binId: 'b1', type: 'screw', thread: 'M3', headType: 'socket', drive: 'Hex', length: 12 },
    'the last step keeps everything upstream, and a numeric field comes back as a number')
})

test('clearing a step leaves it unanswered', () => {
  const sel = { _binId: 'b1', type: 'nut', variant: 'nut-square', thread: 'M3' }
  assert.deepEqual(
    selectionAfter(sel, 'nut', 'variant', null),
    { _binId: 'b1', type: 'nut' })
})

test('numeric fields are coerced, string fields are not', () => {
  assert.equal(coerceFieldValue('length', '8'), 8)
  assert.equal(coerceFieldValue('thread', 'M8'), 'M8')
})

// ── Stepping along a cascade (bin duplication) ────────────────────────────────

test('duplicating steps one along the size range', () => {
  // A socket screw should advance to the next length in its family.
  const m3x8 = db.find(e => e.headType === 'socket' && e.thread === 'M3' && e.length === 8)
  assert.ok(m3x8, 'fixture: an M3x8 socket screw exists')
  const next = nextAlongCascade(m3x8)
  assert.ok(next, 'there is a next length')
  assert.equal(next.thread, 'M3')
  assert.equal(next.headType, 'socket')
  assert.ok(next.length > 8, 'it steps up, not down')

  // A nut has no numeric dimension in its cascade, so there is nothing to step.
  const nut = db.find(e => e.headType === 'nut')
  assert.equal(nextAlongCascade(nut), null)

  // The longest part in a family is the end of the range.
  const family = db.filter(e => e.headType === m3x8.headType && e.thread === m3x8.thread &&
                                 e.catalogRef === m3x8.catalogRef && e.length != null)
  const longest = family.reduce((a, b) => (b.length > a.length ? b : a))
  assert.equal(nextAlongCascade(longest), null)
})

test('stepping stays inside the part family', () => {
  // Whatever a type steps, everything else about the part must hold: the same
  // supplier, the same geometry, and one move along the stepped dimension only.
  let stepped = 0
  for (const e of db) {
    const next = nextAlongCascade(e)
    if (!next) continue
    stepped++
    assert.equal(next.supplier, e.supplier, `${e.sku} crossed catalogs`)
    assert.equal(next.headType, e.headType, `${e.sku} changed head type`)

    if (e.length != null && next.length != null) {
      // Fasteners step length, holding the thread.
      assert.equal(next.thread, e.thread, `${e.sku} changed thread`)
      assert.ok(next.length > e.length, `${e.sku} did not step up`)
    } else if (e.slotSize != null) {
      // T-slot nuts step the thread, holding the profile slot.
      assert.equal(next.slotSize, e.slotSize, `${e.sku} changed profile slot`)
      assert.notEqual(next.thread, e.thread, `${e.sku} did not step thread`)
    }
  }
  assert.ok(stepped > 500, `expected most of the catalog to step, got ${stepped}`)
})
