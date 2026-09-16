/** Part type: heat-set / press-in threaded insert. */

import { nominalDiameter } from './_shared.js'

export default {
  id: 'insert',
  label: 'Insert',

  headTypes: ['insert'],
  headLabels: { insert: 'Threaded Insert' },

  shortLabel(part) {
    const thread = part.thread || ''
    const length = part.length
    const size   = thread + (length ? '×' + length : '')
    return [size, part.headType || 'insert', part.drive || ''].filter(Boolean).join(' · ')
  },

  /** Knurled sleeve: OD ~1.7d. */
  volumeMM3(part) {
    const diam = nominalDiameter(part.thread)
    return Math.PI * (diam * 0.85) ** 2 * (part.length || 10) * 1.4
  },
}
