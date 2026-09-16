/**
 * Part type: washer.
 *
 * Length-independent: thickness is fixed by the standard (DIN 125 / DIN 9021).
 */

import { nominalDiameter } from './_shared.js'

export default {
  id: 'washer',
  label: 'Washer',

  headTypes: ['washer'],
  headLabels: { washer: 'Washer' },

  lengthIndependent: true,

  shortLabel(part) {
    return `${part.thread || ''} Washer`
  },

  /**
   * Standard washer DIN 125: OD ~2.25d, ID ~1.08d, thickness ~0.2d.
   * Generous packing penalty because washers settle in random orientations.
   */
  volumeMM3(part) {
    const diam = nominalDiameter(part.thread)
    const washVol = Math.PI * ((diam * 1.125) ** 2 - (diam * 0.54) ** 2) * (diam * 0.20)
    return washVol * 2.5
  },
}
