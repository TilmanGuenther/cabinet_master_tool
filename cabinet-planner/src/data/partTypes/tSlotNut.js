/**
 * Part type: T-slot nut.
 *
 * Slides into the slot of an aluminium extrusion and gives it a threaded hole.
 * Sized by the profile's slot width first and the thread second -- an M5 nut for
 * a slot-6 profile and an M5 nut for a slot-8 profile are different parts, and
 * neither fits the other's extrusion.
 *
 * Distinct from `nut`: there is no across-flats dimension, no hex, and the
 * thread is the smaller of the two defining numbers rather than the only one.
 */

import {
  topTSlotNut, sideTSlotNut, R_X, R_Y, R_W, R_H,
} from '../../utils/partShapes.js'
import { f } from '../../utils/partDims.js'

/**
 * Block dimensions by slot width, in mm: [length, width, height].
 *
 * ESTIMATES. Manufacturers do not share a standard for these -- Motedis, item
 * and Bosch Rexroth all differ -- and the figures below are typical rather than
 * measured. They feed `volumeMM3` and therefore every order-list quantity, so
 * replace them with a supplier's real dimensions when you have them: this table
 * is the only place they are used.
 */
const BLOCK_MM = {
  5: { length: 10, width: 5, height: 3.0 },
  6: { length: 13, width: 6, height: 4.0 },
  8: { length: 16, width: 8, height: 5.0 },
}

/** Fall back to a slot-6 shaped block scaled to whatever slot was given. */
function blockFor(part) {
  const slot = part.slotSize
  if (BLOCK_MM[slot]) return BLOCK_MM[slot]
  const s = slot || 6
  return { length: s * 2.1, width: s, height: s * 0.65 }
}

export default {
  id: 't-slot-nut',
  label: 'T-Slot Nut',

  headTypes: ['t-slot-nut'],
  headLabels: { 't-slot-nut': 'T-Slot Nut' },

  // Slot first: it decides which profile the part fits at all, and a given
  // supplier stocks a different thread range per slot.
  cascade: ['variant', 'slotSize', 'thread'],

  // Duplicating a bin should step the thread, not the slot: the slot decides
  // which profile the part fits at all, so stepping it would hand you a nut for
  // a different extrusion. Without this the engine would pick slotSize, being
  // the last numeric field in the cascade.
  stepField: 'thread',

  variants: [
    { value: 'tnut-spring-ball', label: 'Spring Ball, Guided' },
    { value: 'tnut-guided',      label: 'Guided' },
    { value: 'tnut-plain',       label: 'Plain' },
  ],

  /** "M5 Slot 6 Spring Ball, Guided" -- the generic builder assumes a length. */
  describe(entry, variantLabel) {
    return [
      entry.thread,
      entry.slotSize != null ? `Slot ${entry.slotSize}` : '',
      variantLabel,
      entry.material,
    ].filter(Boolean).join(' ')
  },

  shortLabel(part) {
    const slot = part.slotSize != null ? ` · Slot ${part.slotSize}` : ''
    return `${part.thread || ''}${slot} · T-Nut`
  },

  /**
   * A rectangular block, less the threaded bore.
   *
   * Packing factor 1.6: flat blocks stack reasonably but the spring ball and the
   * guidance lugs stop them nesting flush. An estimate, like the block
   * dimensions above -- check it against a real bin before trusting a quantity.
   */
  volumeMM3(part) {
    const { length, width, height } = blockFor(part)
    const boreD = threadDiameter(part.thread)
    const solid = length * width * height
    const bore = Math.PI * (boreD / 2) ** 2 * height
    return Math.max(solid - bore, solid * 0.4) * 1.6
  },

  svg: {
    // The outline from above is what tells one T-nut from another.
    layout: 'top-first',
    top: (part, cx, cy, r) => topTSlotNut(cx, cy, r, part),
    side: part => sideTSlotNut(part, R_X, R_Y, R_W, R_H),
    // A block a centimetre long has no length worth shortening.
    reducible: false,
    mmPerUnit(part) {
      const { length, height } = blockFor(part)
      const scale = Math.min((R_H * 0.72) / height, (R_W * 0.82) / length)
      return 1 / scale
    },
    labelBody(part) {
      const { length, width, height } = blockFor(part)
      const boreD = threadDiameter(part.thread)
      const W = length
      const H = width
      // Seen from above: the block outline with its threaded bore.
      const content =
        `<rect x="0" y="0" width="${f(W)}" height="${f(H)}" rx="${f(Math.min(W, H) * 0.12)}" fill="#111"/>` +
        `<circle cx="${f(W / 2)}" cy="${f(H / 2)}" r="${f(boreD / 2)}" fill="#aaa"/>` +
        // The step that keys into the slot, hinted along both long edges.
        `<rect x="0" y="0" width="${f(W)}" height="${f(height * 0.18)}" fill="#444"/>` +
        `<rect x="0" y="${f(H - height * 0.18)}" width="${f(W)}" height="${f(height * 0.18)}" fill="#444"/>`
      return { W, H, content }
    },
  },
}

/** Nominal thread diameter, e.g. "M5" -> 5. */
function threadDiameter(thread) {
  return parseFloat(String(thread).replace(/^M/i, '')) || 4
}
