/**
 * Part type: press-in nut (e.g. PEM KF2).
 *
 * Length-independent: a flat disc with a wide flange, so overall height is set
 * by the thread size rather than by a length field.
 */

import { nominalDiameter } from './_shared.js'
import {
  topPressNut, sidePressNut, R_X, R_Y, R_W, R_H,
} from '../../utils/fastenerShapes.js'
import { d, f } from '../../utils/fastenerDims.js'

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

  svg: {
    layout: 'side-first',
    top:  (part, cx, cy, r) => topPressNut(cx, cy, r),
    side: part => sidePressNut(part, R_X, R_Y, R_W, R_H),
    reducible: false,
    mmPerUnit(part) {
      const nomD  = d(part.thread)
      const scale = Math.min((R_H * 0.72) / (nomD * 1.05), (R_W * 0.82) / (nomD * 1.85))
      return 1 / scale
    },
    /**
     * Compact horizontal label silhouette, drawn at 1 SVG unit = 1 mm.
     * Wide flange on the left, narrower body on the right, bore through.
     */
    labelBody(part) {
      const nomD = d(part.thread)
      const len  = part.length || 10
      const ht   = part.headType
      let W, H, content
      // Side profile: wide flange left + narrower body right, bore through centre
      const flangeW_mm = nomD * 1.85
      const bodyW_mm   = nomD * 1.40
      const flangeH_mm = nomD * 0.50
      const bodyH_mm   = nomD * 0.55
      const holeW_mm   = nomD * 0.85
      W = flangeH_mm + bodyH_mm
      H = flangeW_mm
      const cy = H / 2
      // Horizontal layout: flange on left (taller cross-section), body on right (narrower)
      const bOff = (H - bodyW_mm) / 2
      content =
        `<rect x="0" y="0" width="${f(flangeH_mm)}" height="${f(flangeW_mm)}" fill="#111"/>` +
        `<rect x="${f(flangeH_mm)}" y="${f(bOff)}" width="${f(bodyH_mm)}" height="${f(bodyW_mm)}" fill="#111"/>` +
        `<rect x="0" y="${f(cy - holeW_mm / 2)}" width="${f(W)}" height="${f(holeW_mm)}" fill="#aaa"/>`

      return { W, H, content }
    },
  },
}
