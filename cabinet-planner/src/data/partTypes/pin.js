/**
 * Part type: cylindrical / dowel pin.
 *
 * Smooth-shank, so its size field is a nominal diameter ("Ø3") rather than a
 * thread designation.
 */

import { nominalDiameter, cylinderVol } from './_shared.js'

export default {
  id: 'pin',
  label: 'Pin',

  headTypes: ['pin'],
  headLabels: { pin: 'Cylindrical Pin' },

  shortLabel(part) {
    const len = part.length ? '×' + part.length : ''
    return `${part.thread || ''}${len} · Pin`
  },

  /** Plain cylinder at the nominal diameter (ISO 2338). */
  volumeMM3(part) {
    return cylinderVol(nominalDiameter(part.thread), part.length || 10) * 1.4
  },
}
