/** Part type: hex standoff / spacer pillar. */

import { nominalDiameter, hexArea } from './_shared.js'

export default {
  id: 'standoff',
  label: 'Standoff',

  headTypes: ['standoff'],
  headLabels: { standoff: 'Standoff' },

  shortLabel(part) {
    const len = part.length ? '×' + part.length : ''
    return `${part.thread || ''}${len} · Standoff`
  },

  /** Hex body: across-flats ~2d. Cylinder-dominant, so it packs reasonably well. */
  volumeMM3(part) {
    const diam = nominalDiameter(part.thread)
    const len  = part.length || 10
    return hexArea(diam * 2.0) * len * 1.4
  },
}
