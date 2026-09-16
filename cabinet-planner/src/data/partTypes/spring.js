/**
 * Part type: helical spring.
 *
 * Sized by outer diameter, free length and wire diameter. Compression,
 * extension and torsion springs differ enough to be separate variants.
 */

import {
  topAnnulus, sideSpring, R_X, R_Y, R_W, R_H,
} from '../../utils/fastenerShapes.js'
import { f } from '../../utils/fastenerDims.js'

export default {
  id: 'spring',
  label: 'Spring',

  headTypes: ['spring'],
  headLabels: { spring: 'Spring' },

  cascade: ['variant', 'outerD', 'freeLength', 'wireD'],

  variants: [
    { value: 'spring-compression', label: 'Compression Spring' },
    { value: 'spring-extension',   label: 'Extension Spring' },
    { value: 'spring-torsion',     label: 'Torsion Spring' },
  ],

  describe(entry, variantLabel) {
    // The variant label usually names the material already ("NBR 70 Shore A"),
    // so the raw material is only a fallback.
    return [sizeText(entry), variantLabel || entry.material].filter(Boolean).join(' ')
  },

  shortLabel(part) {
    return `${sizeText(part)} · Spring`
  },

  /**
   * The cylinder a spring sweeps: π(OD/2)² × free length.
   *
   * Packing factor 2.2: springs tangle with each other, so a bin holds rather
   * fewer than the envelope volume suggests. An estimate — calibrate it.
   */
  volumeMM3(part) {
    const od = part.outerD || 1
    return Math.PI * (od / 2) ** 2 * (part.freeLength || 10) * 2.2
  },

  svg: {
    layout: 'side-first',
    // End-on, a spring is a ring of wire.
    top: (part, cx, cy, r) => topAnnulus(cx, cy, r, coilBoreRatio(part)),
    side: part => sideSpring(part, R_X, R_Y, R_W, R_H),
    // A long spring is worth shortening, and it is symmetric end to end.
    reducible: true,
    breakCentred: true,
    breakFullHeight: true,
    mmPerUnit(part) {
      const scale = Math.min(
        (R_H * 0.88) / (part.freeLength || 20),
        (R_W * 0.70) / (part.outerD || 6),
      )
      return 1 / scale
    },
    labelBody(part) {
      const od   = part.outerD || 6
      const len  = part.freeLength || 20
      const wire = part.wireD || Math.max(od * 0.12, 0.5)
      const W = len
      const H = od
      const coils = Math.max(3, Math.min(14, Math.round(len / Math.max(wire * 2.2, 0.8))))
      const pitch = W / coils

      let content = ''
      for (let i = 0; i < coils; i++) {
        const x = pitch * (i + 0.5)
        content += `<ellipse cx="${f(x)}" cy="${f(H / 2)}" rx="${f(pitch * 0.42)}" ry="${f(H / 2)}" ` +
                   `fill="none" stroke="#111" stroke-width="${f(Math.max(wire, 0.25))}"/>`
      }
      return { W, H, content }
    },
  },
}

function sizeText(part) {
  if (part.outerD == null) return ''
  const len = part.freeLength != null ? `×${part.freeLength}` : ''
  return `Ø${part.outerD}${len}`
}

/** The hollow inside a coil, as a fraction of outer diameter. */
function coilBoreRatio(part) {
  const od = part.outerD || 6
  const wire = part.wireD || Math.max(od * 0.12, 0.5)
  return Math.max(0.05, (od - 2 * wire) / od)
}
