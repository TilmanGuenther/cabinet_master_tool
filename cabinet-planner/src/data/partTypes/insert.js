/** Part type: heat-set / press-in threaded insert. */

import { nominalDiameter } from './_shared.js'
import {
  topInsert, sideInsert, R_X, R_Y, R_W, R_H,
} from '../../utils/fastenerShapes.js'
import { d, f } from '../../utils/fastenerDims.js'

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

  svg: {
    layout: 'side-first',
    top:  (part, cx, cy, r) => topInsert(cx, cy, r),
    side: part => sideInsert(part, R_X, R_Y, R_W, R_H),
    reducible: true,
    breakCentred: false,
    breakFullHeight: true,
    mmPerUnit(part) {
      const scale = Math.min(
        (R_H * 0.88) / (part.length || 10),
        (R_W * 0.72) / (d(part.thread) * 1.8),
      )
      return 1 / scale
    },
    /**
     * Compact horizontal label silhouette, drawn at 1 SVG unit = 1 mm.
     * Knurled cylinder with the thread bore on the right end.
     */
    labelBody(part) {
      const nomD = d(part.thread)
      const len  = part.length || 10
      const ht   = part.headType
      let W, H, content
      // Horizontal cylinder with knurl bands + thread bore on right end
      const bodyH_mm = nomD * 1.8
      const holeD    = nomD * 0.85
      const holeLen  = len * 0.55
      W = len
      H = bodyH_mm
      const cy = H / 2
      const nBands = Math.max(3, Math.round(len / (nomD * 0.9)))
      let bands = ''
      for (let i = 1; i < nBands; i++) {
        const x = (W / nBands) * i
        bands += `<line x1="${f(x)}" y1="0" x2="${f(x)}" y2="${f(H)}" stroke="#555" stroke-width="0.5"/>`
      }
      content =
        `<rect x="0" y="0" width="${f(W)}" height="${f(H)}" fill="#111"/>` +
        bands +
        `<rect x="${f(W - holeLen)}" y="${f(cy - holeD / 2)}" width="${f(holeLen)}" height="${f(holeD)}" fill="#aaa"/>`
      return { W, H, content }
    },
  },
}
