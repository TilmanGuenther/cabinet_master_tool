/** Part type: hex standoff / spacer pillar. */

import { nominalDiameter, hexArea } from './_shared.js'
import {
  topHex, sideStandoff, R_X, R_Y, R_W, R_H,
} from '../../utils/fastenerShapes.js'
import { d, f, isMFStandoff } from '../../utils/fastenerDims.js'

export default {
  id: 'standoff',
  label: 'Standoff',

  headTypes: ['standoff'],
  headLabels: { standoff: 'Standoff' },

  // M/F and F/F standoffs are physically different parts.
  cascade: ['variant', 'thread', 'length'],

  variants: [
    { value: 'standoff-mf', label: 'Hex Standoff M/F' },
    { value: 'standoff-ff', label: 'Hex Standoff F/F' },
  ],

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

  svg: {
    layout: 'side-first',
    top:  (part, cx, cy, r) => topHex(cx, cy, r, r * 0.38),
    side: part => sideStandoff(part, R_X, R_Y, R_W, R_H),
    reducible: true,
    breakCentred: false,
    breakFullHeight: true,
    mmPerUnit(part) {
      const nomD  = d(part.thread)
      const studH = isMFStandoff(part) ? nomD * 1.2 : 0
      const scale = Math.min(
        (R_H * 0.88) / ((part.length || 10) + studH),
        (R_W * 0.72) / (nomD * 1.75),
      )
      return 1 / scale
    },
    /**
     * Compact horizontal label silhouette, drawn at 1 SVG unit = 1 mm.
     * Hex body with bores at each end, plus a male stud for M/F parts.
     */
    labelBody(part) {
      const nomD = d(part.thread)
      const len  = part.length || 10
      const ht   = part.headType
      let W, H, content
      const mf      = isMFStandoff(part)
      const bW      = nomD * 1.75
      const hD      = nomD * 1.05
      const hLen    = nomD * 1.2
      const studLen = mf ? nomD * 1.2 : 0
      W = len + studLen
      H = bW
      const cy = H / 2
      if (mf) {
        // Hex body (shifted right by studLen), female hole on right end, male stud on left
        content =
          `<rect x="${f(studLen)}" y="0" width="${f(len)}" height="${f(bW)}" fill="#111"/>` +
          `<rect x="${f(studLen + len - hLen)}" y="${f(cy - hD / 2)}" width="${f(hLen)}" height="${f(hD)}" fill="#aaa"/>` +
          `<rect x="0" y="${f(cy - hD / 2)}" width="${f(studLen)}" height="${f(hD)}" fill="#111"/>` +
          `<line x1="${f(studLen)}" y1="${f(cy)}" x2="${f(studLen + len - hLen)}" y2="${f(cy)}" stroke="white" stroke-width="0.3" stroke-dasharray="1,1"/>`
      } else {
        content =
          `<rect x="0" y="0" width="${f(len)}" height="${f(bW)}" fill="#111"/>` +
          `<rect x="0" y="${f(cy - hD / 2)}" width="${f(hLen)}" height="${f(hD)}" fill="#aaa"/>` +
          `<rect x="${f(len - hLen)}" y="${f(cy - hD / 2)}" width="${f(hLen)}" height="${f(hD)}" fill="#aaa"/>` +
          `<line x1="${f(hLen)}" y1="${f(cy)}" x2="${f(len - hLen)}" y2="${f(cy)}" stroke="white" stroke-width="0.3" stroke-dasharray="1,1"/>`
      }
      return { W, H, content }
    },
  },
}
