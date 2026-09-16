/**
 * Part type: cylindrical / dowel pin.
 *
 * Smooth-shank, so its size field is a nominal diameter ("Ø3") rather than a
 * thread designation.
 */

import { nominalDiameter, cylinderVol } from './_shared.js'
import {
  topPin, sidePin, R_X, R_Y, R_W, R_H,
} from '../../utils/fastenerShapes.js'
import { d, f } from '../../utils/fastenerDims.js'

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

  svg: {
    layout: 'side-first',
    top:  (part, cx, cy, r) => topPin(cx, cy, r * 0.55),
    side: part => sidePin(part, R_X, R_Y, R_W, R_H),
    // Symmetric end to end, so a shortened drawing breaks in the middle.
    reducible: true,
    breakCentred: true,
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
     * Plain rounded-end cylinder.
     */
    labelBody(part) {
      const nomD = d(part.thread)
      const len  = part.length || 10
      const ht   = part.headType
      let W, H, content
      W = len
      H = nomD
      const cr = Math.min(H / 2, H * 0.15)
      content = `<rect x="0" y="0" width="${f(W)}" height="${f(H)}" rx="${f(cr)}" fill="#111"/>`
      return { W, H, content }
    },
  },
}
