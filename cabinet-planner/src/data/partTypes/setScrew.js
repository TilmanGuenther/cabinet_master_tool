/** Part type: set screw / grub screw (headless). */

import { nominalDiameter, cylinderVol } from './_shared.js'
import {
  topScrew, sideSetScrew, R_X, R_Y, R_W, R_H,
} from '../../utils/fastenerShapes.js'
import { d, f } from '../../utils/fastenerDims.js'

export default {
  id: 'set-screw',
  label: 'Set Screw',

  headTypes: ['set-screw'],
  headLabels: { 'set-screw': 'Set Screw' },

  cascade: ['thread', 'drive', 'length'],

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

  svg: {
    layout: 'side-first',
    // Headless, so the drive recess is the only thing to show from above.
    top:  (part, cx, cy, r) => topScrew(cx, cy, r, part.drive || 'Hex'),
    side: part => sideSetScrew(part, R_X, R_Y, R_W, R_H),
    reducible: true,
    breakCentred: false,
    breakFullHeight: true,
    mmPerUnit(part) {
      const scale = Math.min(
        (R_H * 0.88) / (part.length || 10),
        (R_W * 0.55) / d(part.thread),
      )
      return 1 / scale
    },
    /**
     * Compact horizontal label silhouette, drawn at 1 SVG unit = 1 mm.
     * Headless cylinder with the drive socket on the right end.
     */
    labelBody(part) {
      const nomD = d(part.thread)
      const len  = part.length || 10
      const ht   = part.headType
      let W, H, content
      // Headless cylinder — same OD as thread, hex socket on right end
      const sockLen = nomD * 0.6
      const sockH   = nomD * 0.52
      W = len
      H = nomD
      const cy = H / 2
      content =
        `<rect x="0" y="0" width="${f(W)}" height="${f(H)}" fill="#111"/>` +
        `<rect x="${f(W - sockLen)}" y="${f(cy - sockH / 2)}" width="${f(sockLen)}" height="${f(sockH)}" fill="#aaa"/>`
      return { W, H, content }
    },
  },
}
