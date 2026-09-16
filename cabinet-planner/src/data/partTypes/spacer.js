/**
 * Part type: unthreaded spacer.
 *
 * A plain tube used to set a gap. Distinct from a standoff, which is threaded
 * at one or both ends; a spacer has a clearance bore straight through.
 */

import {
  topAnnulus, topHexBore, sideSpacer, R_X, R_Y, R_W, R_H,
} from '../../utils/fastenerShapes.js'
import { f } from '../../utils/fastenerDims.js'

export default {
  id: 'spacer',
  label: 'Spacer',

  headTypes: ['spacer'],
  headLabels: { spacer: 'Spacer' },

  cascade: ['variant', 'outerD', 'innerD', 'length'],

  variants: [
    { value: 'spacer-round', label: 'Round Spacer' },
    { value: 'spacer-hex',   label: 'Hex Spacer' },
  ],

  describe(entry, variantLabel) {
    // The variant label usually names the material already ("NBR 70 Shore A"),
    // so the raw material is only a fallback.
    return [sizeText(entry), variantLabel || entry.material].filter(Boolean).join(' ')
  },

  shortLabel(part) {
    return `${sizeText(part)} · Spacer`
  },

  /**
   * Annular cylinder: the tube wall only, since the bore is air.
   *
   * Packing factor 1.4, matching standoffs — short rigid tubes of similar
   * proportions pack about as well.
   */
  volumeMM3(part) {
    const od = part.outerD || 1
    const id = part.innerD || 0
    const wall = Math.PI * ((od / 2) ** 2 - (id / 2) ** 2)
    return Math.max(wall, 0) * (part.length || 10) * 1.4
  },

  svg: {
    layout: 'side-first',
    top: (part, cx, cy, r) => (part.variant === 'spacer-hex'
      ? topHexBore(cx, cy, r, boreRatio(part))
      : topAnnulus(cx, cy, r, boreRatio(part))),
    side: part => sideSpacer(part, R_X, R_Y, R_W, R_H),
    reducible: true,
    breakCentred: false,
    breakFullHeight: true,
    mmPerUnit(part) {
      const scale = Math.min(
        (R_H * 0.88) / (part.length || 10),
        (R_W * 0.72) / (part.outerD || 6),
      )
      return 1 / scale
    },
    labelBody(part) {
      const od = part.outerD || 6
      const id = part.innerD ?? od * 0.5
      const W = part.length || 10
      const H = od
      const boreH = Math.min(id, od)
      const content =
        `<rect x="0" y="0" width="${f(W)}" height="${f(H)}" fill="#111"/>` +
        `<rect x="0" y="${f((H - boreH) / 2)}" width="${f(W)}" height="${f(boreH)}" fill="#aaa"/>`
      return { W, H, content }
    },
  },
}

function sizeText(part) {
  if (part.outerD == null) return ''
  const bore = part.innerD != null ? `/Ø${part.innerD}` : ''
  const len  = part.length != null ? `×${part.length}` : ''
  return `Ø${part.outerD}${bore}${len}`
}

/** Bore as a fraction of outer diameter. */
function boreRatio(part) {
  const od = part.outerD || 6
  const id = part.innerD ?? od * 0.5
  return od > 0 ? Math.min(id, od) / od : 0.5
}
