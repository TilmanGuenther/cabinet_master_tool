/**
 * Part type: nut.
 *
 * Length-independent: height is fixed by the standard, so bulk density comes
 * from the empirical table rather than from `length`.
 */

import { nominalDiameter, hexArea } from './_shared.js'
import {
  topHex, topSquareNut, sideNut, R_X, R_Y, R_W, R_H,
} from '../../utils/partShapes.js'
import { d, f, isSquareNut, isNylocNut } from '../../utils/partDims.js'

export default {
  id: 'nut',
  label: 'Nut',

  headTypes: ['nut'],
  headLabels: { nut: 'Nut' },

  // Square, nyloc and thin hex nuts differ enough to ask first.
  cascade: ['variant', 'thread'],

  variants: [
    { value: 'nut-square',   label: 'Square Nut' },
    { value: 'nut-nylon',    label: 'Nylon Insert Lock Nut' },
    { value: 'nut-hex-thin', label: 'Thin Hex Nut' },
  ],

  lengthIndependent: true,

  shortLabel(part) {
    return `${part.thread || ''} ${isNylocNut(part) ? 'Nyloc Nut' : 'Hex Nut'}`
  },

  /** Hex nut: across-flats ~1.74d, height ~0.8d. Geometric fallback only. */
  volumeMM3(part) {
    const diam = nominalDiameter(part.thread)
    return hexArea(diam * 1.74) * (diam * 0.8) * 1.3
  },

  svg: {
    // A nut is recognised by its outline from above, so the top view leads.
    layout: 'top-first',
    top: (part, cx, cy, r) => isSquareNut(part)
      ? topSquareNut(cx, cy, r, r * 0.40)
      : topHex(cx, cy, r, r * 0.40),
    side: part => sideNut(part, R_X, R_Y, R_W, R_H),
    // Width is the across-flats dimension, not a length worth shortening.
    reducible: false,
    mmPerUnit(part) {
      const nomD  = d(part.thread)
      const sq    = isSquareNut(part)
      const nyloc  = !sq && isNylocNut(part)
      const totalH = (sq ? nomD * 0.60 : nomD * 0.80) * (nyloc ? 1.50 : 1.0)
      const bodyW  = sq ? nomD * 2.5 : nomD * 1.75
      const scale  = Math.min((R_H * 0.72) / totalH, (R_W * 0.72) / bodyW)
      return 1 / scale
    },
    /**
     * Compact horizontal label silhouette, drawn at 1 SVG unit = 1 mm.
     * Across-flats profile, with the nylon insert drawn below when present.
     */
    labelBody(part) {
      const nomD = d(part.thread)
      let W, H, content
      const sq    = isSquareNut(part)
      const bW    = sq ? nomD * 2.5  : nomD * 1.75
      const bH    = sq ? nomD * 0.60 : nomD * 0.80
      const holeW = nomD * 1.05
      const nyloc = !sq && isNylocNut(part)
      W = bW
      H = bH * (nyloc ? 1.50 : 1.0)
      if (sq) {
        // Square nut: plain rectangle, no chamfers
        content =
          `<rect x="0" y="0" width="${f(bW)}" height="${f(bH)}" fill="#111"/>` +
          `<rect x="${f(bW / 2 - holeW / 2)}" y="0" width="${f(holeW)}" height="${f(bH)}" fill="#aaa"/>`
      } else {
        const ch = Math.min(bW, bH) * 0.07
        const bodyPath =
          `M ${f(ch)},0 L ${f(bW - ch)},0 L ${f(bW)},${f(ch)} ` +
          `L ${f(bW)},${f(bH - ch)} L ${f(bW - ch)},${f(bH)} ` +
          `L ${f(ch)},${f(bH)} L 0,${f(bH - ch)} L 0,${f(ch)} Z`
        content =
          `<path d="${bodyPath}" fill="#111"/>` +
          `<rect x="${f(bW / 2 - holeW / 2)}" y="0" width="${f(holeW)}" height="${f(bH)}" fill="#aaa"/>`
        if (nyloc) {
          const insH = bH * 0.50
          content +=
            `<rect x="0" y="${f(bH)}" width="${f(bW)}" height="${f(insH)}" fill="#888"/>` +
            `<rect x="${f(bW / 2 - holeW / 2)}" y="${f(bH)}" width="${f(holeW)}" height="${f(insH * 0.55)}" fill="#ccc"/>` +
            `<line x1="0" y1="${f(bH)}" x2="${f(bW)}" y2="${f(bH)}" stroke="white" stroke-width="0.3"/>`
        }
      }
      return { W, H, content }
    },
  },
}
