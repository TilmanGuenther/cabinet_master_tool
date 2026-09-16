/**
 * Part type: nut.
 *
 * Length-independent: height is fixed by the standard, so bulk density comes
 * from the empirical table rather than from `length`.
 */

import { nominalDiameter, hexArea } from './_shared.js'

export default {
  id: 'nut',
  label: 'Nut',

  headTypes: ['nut'],
  headLabels: { nut: 'Nut' },

  lengthIndependent: true,

  shortLabel(part) {
    const nyloc = part.description?.toLowerCase().includes('nyloc') ||
                  part.standard?.includes('985')
    return `${part.thread || ''} ${nyloc ? 'Nyloc Nut' : 'Hex Nut'}`
  },

  /** Hex nut: across-flats ~1.74d, height ~0.8d. Geometric fallback only. */
  volumeMM3(part) {
    const diam = nominalDiameter(part.thread)
    return hexArea(diam * 1.74) * (diam * 0.8) * 1.3
  },
}
