/**
 * Part type: o-ring.
 *
 * The first built-in type with no thread, no head and no length. It exists as
 * much to prove the extension point as to be useful: everything it needs is
 * declared here, and no view, renderer or query knows it is special.
 *
 * Sized by inner diameter and cord cross-section, per ISO 3601.
 */

import {
  topAnnulus, sideORing, R_X, R_Y, R_W, R_H,
} from '../../utils/fastenerShapes.js'
import { f } from '../../utils/fastenerDims.js'

export default {
  id: 'o-ring',
  label: 'O-Ring',

  // An o-ring has one geometry, so `headTypes` is just its own id. The field is
  // named for its fastener origins; it means "which geometry does this cover".
  headTypes: ['o-ring'],
  headLabels: { 'o-ring': 'O-Ring' },

  cascade: ['variant', 'innerD', 'crossSection'],

  variants: [
    { value: 'oring-nbr70', label: 'NBR 70 Shore A' },
    { value: 'oring-fkm',   label: 'FKM (Viton)' },
    { value: 'oring-epdm',  label: 'EPDM' },
  ],

  /** "Ø10×2 NBR 70 Shore A" — the generic builder assumes a thread, so override. */
  describe(entry, variantLabel) {
    // The variant label usually names the material already ("NBR 70 Shore A"),
    // so the raw material is only a fallback.
    return [sizeText(entry), variantLabel || entry.material].filter(Boolean).join(' ')
  },

  shortLabel(part) {
    return `${sizeText(part)} · O-Ring`
  },

  /**
   * Torus volume, 2π²Rr², where R is the mean radius and r the cord radius.
   *
   * Packing factor 3.0: o-rings nest and tangle badly, trapping a lot of air.
   * This is an estimate, and the one number worth calibrating against a real
   * bin before trusting an order quantity.
   */
  volumeMM3(part) {
    const cs = part.crossSection || 1
    const R  = ((part.innerD || 0) + cs) / 2
    const r  = cs / 2
    return 2 * Math.PI ** 2 * R * r ** 2 * 3.0
  },

  svg: {
    // A ring is recognised from above, so the top view leads.
    layout: 'top-first',
    top: (part, cx, cy, r) => topAnnulus(cx, cy, r, boreRatio(part)),
    side: part => sideORing(part, R_X, R_Y, R_W, R_H),
    // Nothing about an o-ring is long enough to shorten.
    reducible: false,
    mmPerUnit(part) {
      const cs = part.crossSection || 1
      const outerD = (part.innerD || 0) + 2 * cs
      const scale = Math.min((R_H * 0.88) / outerD, (R_W * 0.80) / (cs * 2.2))
      return 1 / scale
    },
    labelBody(part) {
      const cs = part.crossSection || 1
      const outerD = (part.innerD || 0) + 2 * cs
      const W = Math.max(cs, 0.4)
      const H = Math.max(outerD, 1)
      const arm = cs
      const content =
        `<rect x="0" y="0" width="${f(W)}" height="${f(arm)}" rx="${f(W / 2)}" fill="#111"/>` +
        `<rect x="0" y="${f(H - arm)}" width="${f(W)}" height="${f(arm)}" rx="${f(W / 2)}" fill="#111"/>`
      return { W, H, content }
    },
  },
}

function sizeText(part) {
  if (part.innerD == null) return ''
  return `Ø${part.innerD}×${part.crossSection ?? '?'}`
}

/** Bore as a fraction of outer diameter, for the ring seen from above. */
function boreRatio(part) {
  const cs = part.crossSection || 1
  const outerD = (part.innerD || 0) + 2 * cs
  return outerD > 0 ? (part.innerD || 0) / outerD : 0.5
}
