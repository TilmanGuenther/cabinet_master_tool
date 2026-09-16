/** Part type: set screw / grub screw (headless). */

import { nominalDiameter, cylinderVol } from './_shared.js'

export default {
  id: 'set-screw',
  label: 'Set Screw',

  headTypes: ['set-screw'],
  headLabels: { 'set-screw': 'Set Screw' },

  shortLabel(part) {
    const thread = part.thread || ''
    const length = part.length
    const size   = thread + (length ? '×' + length : '')
    // No head, so the head slot in the generic form carries the raw type key.
    return [size, part.headType || 'set-screw', part.drive || ''].filter(Boolean).join(' · ')
  },

  /** No head: a plain threaded cylinder, which packs well. */
  volumeMM3(part) {
    return cylinderVol(nominalDiameter(part.thread), part.length || 10) * 1.3
  },
}
