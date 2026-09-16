/**
 * Part type: press-in nut (e.g. PEM KF2).
 *
 * Length-independent: a flat disc with a wide flange, so overall height is set
 * by the thread size rather than by a length field.
 */

import { nominalDiameter } from './_shared.js'

export default {
  id: 'press-nut',
  label: 'Press-In Nut',

  headTypes: ['press-nut'],
  headLabels: { 'press-nut': 'Press-In Nut' },

  lengthIndependent: true,

  shortLabel(part) {
    const thread = part.thread || ''
    const length = part.length
    const size   = thread + (length ? '×' + length : '')
    return [size, part.headType || 'press-nut', part.drive || ''].filter(Boolean).join(' · ')
  },

  /** Flat disc: flange OD ~1.85d, total height ~1.05d. Packs like a hex nut. */
  volumeMM3(part) {
    const diam = nominalDiameter(part.thread)
    return Math.PI * (diam * 0.925) ** 2 * (diam * 1.05) * 1.5
  },
}
