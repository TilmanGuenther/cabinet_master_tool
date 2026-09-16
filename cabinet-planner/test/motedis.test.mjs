/**
 * Motedis catalog and the T-slot nut part type.
 *
 * The first supplier added after the extension points existed, and the first
 * part type sized by something other than a thread-and-length. Also guards the
 * bug this work uncovered: part records dropped any dimension a type declared
 * beyond the original fastener set.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { CATALOGS, allParts, findBySku } from '../src/data/catalogs/index.js'
import { PART_TYPES, getPartType, shortLabel, resolvePartType } from '../src/data/partTypes/index.js'
import { FIELDS } from '../src/data/partTypes/_fields.js'
import { getDensity } from '../src/data/densities.js'
import { buildCascade, nextAlongCascade } from '../src/views/drawerMap/dmCascade.js'
import { dbEntryToPart } from '../src/views/drawerMap/dmHelpers.js'
import { barcodeValue, skuLabel, partIdentity } from '../src/utils/partIdentity.js'
import { getPartSVG, getPartSVGLabel } from '../src/utils/partSvg.js'

const motedis = allParts().filter(p => p.supplier === 'motedis')

// ── The catalog ───────────────────────────────────────────────────────────────

test('the Motedis catalog covers the eleven listed T-nuts', () => {
  assert.equal(motedis.length, 11)

  const bySlot = {}
  for (const p of motedis) (bySlot[p.slotSize] ??= []).push(p.thread)
  assert.deepEqual(bySlot[5].sort(), ['M3', 'M4', 'M5'])
  assert.deepEqual(bySlot[6].sort(), ['M3', 'M4', 'M5', 'M6'])
  assert.deepEqual(bySlot[8].sort(), ['M4', 'M5', 'M6', 'M8'])
})

test('all eleven are the spring-ball variant, despite the page titles', () => {
  // Motedis titles slot 8 "T-nut guided" and slots 5 and 6 "T-nut with spring
  // ball, with guidance", but every page's product data lists a stainless
  // spring ball. The data decides, not the marketing copy.
  for (const p of motedis) {
    assert.equal(p.variant, 'tnut-spring-ball', `${p.sku} variant`)
  }
})

test('article numbers follow the supplier scheme', () => {
  // S<slot>ISMON<thread>[G] -- slot, I-type, then the thread.
  for (const p of motedis) {
    assert.match(p.sku, /^S[568]ISMONM\d+G?$/, `${p.sku} does not look like a Motedis art. no.`)
    assert.ok(p.sku.startsWith(`S${p.slotSize}`), `${p.sku} disagrees with slot ${p.slotSize}`)
    assert.ok(p.sku.includes(p.thread), `${p.sku} disagrees with thread ${p.thread}`)
  }
  assert.ok(motedis.every(p => p.material), 'every entry states a material')
})

test('Motedis article numbers are labelled and barcoded as its own', () => {
  assert.equal(CATALOGS.motedis.barcode, 'CODE128')
  const part = dbEntryToPart(motedis.find(p => p.sku === 'S6ISMONM5G'))
  assert.equal(barcodeValue(part), 'S6ISMONM5G')
  assert.equal(skuLabel(part), 'Motedis Art. No.',
    'the order list header comes from the catalog, not a hardcoded string')
})

test('a Motedis SKU cannot be confused with a Bossard one', () => {
  const part = dbEntryToPart(motedis[0])
  assert.deepEqual(partIdentity(part), { supplier: 'motedis', sku: motedis[0].sku })
  assert.equal(findBySku('motedis', motedis[0].sku)?.partType, 't-slot-nut')
  assert.equal(findBySku('bossard', motedis[0].sku), null)
})

// ── The cascade ───────────────────────────────────────────────────────────────

test('the assigner asks slot before thread', () => {
  const atSlot = buildCascade({ typeId: 't-slot-nut' })
  assert.equal(atSlot.steps.at(-1).key, 'slotSize')
  assert.deepEqual(atSlot.steps.at(-1).options.map(o => o.label),
    ['Slot 5', 'Slot 6', 'Slot 8'], 'slots in numeric order, labelled as slots')

  const atThread = buildCascade({ typeId: 't-slot-nut', selection: { slotSize: 6 } })
  assert.equal(atThread.steps.at(-1).key, 'thread')
  assert.deepEqual(atThread.steps.at(-1).options.map(o => o.value), ['M3', 'M4', 'M5', 'M6'])
})

test('choosing a slot rules out threads that slot does not offer', () => {
  // M8 exists only in slot 8; M3 only in slots 5 and 6.
  const slot8 = buildCascade({ typeId: 't-slot-nut', selection: { slotSize: 8 } })
  const threads = slot8.steps.at(-1).options.map(o => o.value)
  assert.ok(threads.includes('M8'))
  assert.ok(!threads.includes('M3'), 'slot 8 has no M3 in this range')
})

test('a fully answered cascade resolves to one part', () => {
  const done = buildCascade({ typeId: 't-slot-nut', selection: { slotSize: 6, thread: 'M5' } })
  assert.ok(done.complete)
  assert.equal(done.matches.length, 1)
  assert.equal(done.matches[0].thread, 'M5')
  assert.equal(done.matches[0].slotSize, 6)
})

test('steps with nothing to choose resolve silently', () => {
  // Both catalogs are registered, but only Motedis sells T-nuts and it stocks
  // one variant, so neither question is worth asking: the cascade opens
  // straight on the slot.
  const first = buildCascade({ typeId: 't-slot-nut' })
  assert.equal(first.steps[0].key, 'slotSize')
  assert.equal(first.resolved.supplier, 'motedis')
  assert.equal(first.resolved.variant, 'tnut-spring-ball')
})

// ── Text, density and drawing ────────────────────────────────────────────────

test('a T-nut describes itself by slot and thread', () => {
  const entry = motedis.find(p => p.slotSize === 6 && p.thread === 'M5')
  const part = dbEntryToPart(entry)
  assert.equal(part.description, 'M5 Slot 6 Spring Ball, Guided Steel, zinc-plated')
  assert.equal(shortLabel(part), 'M5 · Slot 6 · T-Nut')
})

test('a bigger slot means a bigger block and fewer per millilitre', () => {
  const m5 = t => motedis.find(p => p.slotSize === t && p.thread === 'M5')
  assert.ok(getDensity(m5(5)) > getDensity(m5(6)), 'slot 5 packs denser than slot 6')
  assert.ok(getDensity(m5(6)) > getDensity(m5(8)), 'slot 6 packs denser than slot 8')
})

test('duplicating a T-nut steps the thread, never the slot', () => {
  // The slot decides which extrusion the part fits, so stepping it would hand
  // you a nut for a different profile. tSlotNut declares stepField: 'thread'.
  const m3 = motedis.find(p => p.sku === 'S6ISMONM3G')
  const next = nextAlongCascade(m3)
  assert.equal(next.sku, 'S6ISMONM4G')
  assert.equal(next.slotSize, 6, 'same profile slot')
  assert.equal(next.thread, 'M4', 'one thread size up')

  // The top of a slot's thread range is the end of the line.
  assert.equal(nextAlongCascade(motedis.find(p => p.sku === 'S6ISMONM6G')), null)
})

test('a T-nut draws at its true block size', () => {
  const part = dbEntryToPart(motedis.find(p => p.slotSize === 8 && p.thread === 'M8'))
  for (const [what, svg] of [['icon', getPartSVG(part)], ['label', getPartSVGLabel(part)]]) {
    assert.ok(svg.length > 60, `${what} rendered empty`)
    assert.ok(!svg.includes('NaN'), `${what} contains NaN`)
  }
  // Slot 8 block is 16 x 8 mm, and labels print 1:1.
  const [, w, h] = getPartSVGLabel(part).match(/width="([0-9.]+)mm" height="([0-9.]+)mm"/)
  assert.equal(Number(w), 16)
  assert.equal(Number(h), 8)
})

// ── The regression this work uncovered ───────────────────────────────────────

test('assigning a part keeps every dimension its type declares', () => {
  // dbEntryToPart used to copy a fixed fastener field list, so an o-ring lost
  // its inner diameter and cord size the moment it was assigned to a bin: the
  // label printed with no size and the order quantity came out ~48x too high.
  // This is generic over the registry so a future part type is covered too.
  const sample = {
    'o-ring':     { innerD: 10, crossSection: 2, variant: 'oring-nbr70' },
    spring:       { outerD: 8, freeLength: 25, wireD: 1, variant: 'spring-compression' },
    spacer:       { outerD: 6, innerD: 3.2, length: 10, variant: 'spacer-round' },
    't-slot-nut': { thread: 'M5', slotSize: 8, variant: 'tnut-guided' },
    screw:        { thread: 'M3', length: 8, drive: 'Hex' },
    nut:          { thread: 'M3', variant: 'nut-square' },
    washer:       { thread: 'M3', variant: 'washer-std' },
    standoff:     { thread: 'M3', length: 10, variant: 'standoff-ff' },
    'set-screw':  { thread: 'M3', length: 6, drive: 'Hex' },
    insert:       { thread: 'M3', length: 5 },
    pin:          { thread: 'Ø3', length: 10 },
    'press-nut':  { thread: 'M3' },
  }

  for (const typeId of Object.keys(PART_TYPES)) {
    const type = getPartType(typeId)
    const dims = sample[typeId]
    assert.ok(dims, `no sample for part type "${typeId}" — add one`)

    const entry = {
      sku: `X-${typeId}`, title: 't', partType: typeId,
      headType: type.headTypes[0], ...dims,
    }
    const part = dbEntryToPart(entry)

    for (const key of Object.keys(dims)) {
      if (!(key in FIELDS)) continue
      assert.equal(part[key], dims[key], `${typeId}: ${key} was dropped on assignment`)
    }
    assert.equal(resolvePartType(part).id, typeId)
    assert.equal(shortLabel(part), shortLabel(entry),
      `${typeId}: label differs once stored`)
    assert.equal(getDensity(part), getDensity(entry),
      `${typeId}: density differs once stored`)
  }
})
