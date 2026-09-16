/**
 * Part type: washer.
 *
 * Length-independent: thickness is fixed by the standard (DIN 125 / DIN 9021).
 */

import { nominalDiameter } from './_shared.js'
import {
  topWasher, sideWasher, R_X, R_Y, R_W, R_H,
} from '../../utils/fastenerShapes.js'
import { d, f, washerDims } from '../../utils/fastenerDims.js'

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

  svg: {
    layout: 'top-first',
    top:  (part, cx, cy, r) => topWasher(cx, cy, r, part),
    side: part => sideWasher(part, R_X, R_Y, R_W, R_H),
    reducible: false,
    mmPerUnit(part) {
      const wd = washerDims(part)
      const scale = Math.min((R_H * 0.55) / wd.thick, (R_W * 0.82) / wd.outerD)
      return 1 / scale
    },
    /**
     * Compact horizontal label silhouette, drawn at 1 SVG unit = 1 mm.
     * Edge-on: two arms with the bore between them.
     */
    labelBody(part) {
      const nomD = d(part.thread)
      const len  = part.length || 10
      const ht   = part.headType
      let W, H, content
      const { outerD: oD, innerD: iD, thick: th } = washerDims(part)
      W = th
      H = oD
      const arm = (oD - iD) / 2
      content =
        `<rect x="0" y="0" width="${f(th)}" height="${f(arm)}" fill="#111"/>` +
        `<rect x="0" y="${f(H - arm)}" width="${f(th)}" height="${f(arm)}" fill="#111"/>`
      return { W, H, content }
    },
  },
}
