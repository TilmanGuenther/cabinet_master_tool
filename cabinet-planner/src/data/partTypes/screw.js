/**
 * Part type: screw.
 *
 * The only built-in type with more than one head geometry, so `headTypes` has
 * several entries and both the volume model and the label text branch on which
 * head a part has.
 */

import { nominalDiameter, cylinderVol, genericVolMM3 } from './_shared.js'
import {
  topScrew, sideScrew, R_X, R_Y, R_W, R_H,
} from '../../utils/partShapes.js'
import { d, f, screwDims } from '../../utils/partDims.js'

/** Compact head names for label text (the long names live in `headLabels`). */
const SHORT_HEAD = {
  socket: 'Socket', 'low-socket': 'Low Socket',
  button: 'Button', countersunk: 'Countersunk',
  pan: 'Pan', flat: 'Flat',
}

export default {
  id: 'screw',
  label: 'Screw',

  headTypes: ['button', 'socket', 'low-socket', 'countersunk', 'pan', 'flat'],

  headLabels: {
    button:       'Button Head',
    socket:       'Socket Head',
    'low-socket': 'Low Socket Head',
    countersunk:  'Countersunk',
    pan:          'Pan Head',
    flat:         'Flat Head',
  },

  // Screws are the only type where head geometry is a question.
  cascade: ['thread', 'headType', 'drive', 'length'],

  shortLabel(part) {
    const thread = part.thread || ''
    const ht     = part.headType || ''
    const length = part.length
    if (!thread && !ht) return part.description || ''

    const size  = thread + (length ? '×' + length : '')
    const head  = SHORT_HEAD[ht] || ht
    return [size, head, part.drive || ''].filter(Boolean).join(' · ')
  },

  /**
   * Head volume plus shank volume, times a random-packing penalty.
   * Head proportions follow the same DIN/ISO approximations as screwDims()
   * in utils/partDims.js.
   */
  volumeMM3(part) {
    const diam = nominalDiameter(part.thread)
    const len  = part.length || 10
    const shankVol = cylinderVol(diam, len)

    switch (part.headType) {
      case 'socket': {
        // Cylindrical head: diameter ~1.5d, height ~1.0d
        const headVol = Math.PI * (diam * 0.75) ** 2 * (diam * 1.00)
        return (headVol + shankVol) * 2.0
      }
      case 'low-socket': {
        // Low-profile cylindrical head: diameter ~1.5d, height ~0.55d (DIN 7984)
        const headVol = Math.PI * (diam * 0.75) ** 2 * (diam * 0.55)
        return (headVol + shankVol) * 2.0
      }
      case 'button': {
        // Dome head: diameter ~2.5d, height ~0.58d (ISO 7380)
        const headVol = Math.PI * (diam * 1.25) ** 2 * (diam * 0.58)
        return (headVol + shankVol) * 2.0
      }
      case 'pan': {
        // Pan head: diameter ~2.0d, height ~0.70d
        const headVol = Math.PI * (diam * 1.00) ** 2 * (diam * 0.70)
        return (headVol + shankVol) * 2.0
      }
      case 'countersunk': {
        // Tapered head (frustum): outer radius = d, inner = d/2, height ~0.6d.
        // Higher packing factor because the flat wide head prevents close packing.
        const R = diam, r = diam / 2, h = diam * 0.60
        const headVol = (Math.PI * h / 3) * (R ** 2 + R * r + r ** 2)
        return (headVol + shankVol) * 2.8
      }
      default:
        return genericVolMM3(diam, len)
    }
  },

  svg: {
    // Screws read best head-first in profile, so the side view leads.
    layout: 'side-first',
    top:  (part, cx, cy, r) => topScrew(cx, cy, r, part.drive),
    side: part => sideScrew(part, R_X, R_Y, R_W, R_H),
    // Long shanks can be drawn shortened with a break mark; the break sits off
    // centre so the head-side stub keeps more detail, and spans only the shaft
    // band rather than the full canvas height.
    reducible: true,
    breakCentred: false,
    breakFullHeight: false,
    mmPerUnit(part) {
      const dims = screwDims(part.headType || 'socket', d(part.thread))
      const scale = Math.min(
        (R_H * 0.88) / (dims.headH + (part.length || 10)),
        (R_W * 0.70) / dims.headW,
      )
      return 1 / scale
    },
    /**
     * Compact horizontal label silhouette, drawn at 1 SVG unit = 1 mm.
     * Head on the right, shaft to the left (the group is mirrored).
     */
    labelBody(part) {
      const nomD = d(part.thread)
      const len  = part.length || 10
      const ht   = part.headType
      let W, H, content

      const dims = screwDims(ht, nomD)
      const hH   = dims.headH   // head length (horizontal mm)
      const hW   = dims.headW   // head cross-section (vertical mm)
      const sD   = nomD         // shaft diameter
      W = hH + len
      H = hW
      const cy = H / 2

      let head
      if (ht === 'socket' || ht === 'low-socket') {
        const rW = hH * 0.45, rH = hW * 0.50
        head =
          `<rect x="0" y="0" width="${f(hH)}" height="${f(hW)}" fill="#111"/>` +
          `<rect x="0" y="${f(cy - rH / 2)}" width="${f(rW)}" height="${f(rH)}" fill="#aaa"/>`
      } else if (ht === 'button') {
        const cornerR = Math.min(hH * 0.12, hW * 0.12)
        const p =
          `M ${f(hH)},${f(cornerR)} ` +
          `L ${f(hH)},${f(hW - cornerR)} ` +
          `Q ${f(hH)},${f(hW)} ${f(hH - cornerR)},${f(hW)} ` +
          `Q ${f(hH * 0.3)},${f(hW)} 0,${f(cy)} ` +
          `Q ${f(hH * 0.3)},0 ${f(hH - cornerR)},0 ` +
          `Q ${f(hH)},0 ${f(hH)},${f(cornerR)} Z`
        head = `<path d="${p}" fill="#111"/>`
      } else if (ht === 'countersunk') {
        head = `<path d="M 0,0 L 0,${f(hW)} L ${f(hH)},${f(cy + sD / 2)} L ${f(hH)},${f(cy - sD / 2)} Z" fill="#111"/>`
      } else {
        head = `<rect x="0" y="0" width="${f(hH)}" height="${f(hW)}" fill="#111"/>`
      }

      const shaft = `<rect x="${f(hH)}" y="${f(cy - sD / 2)}" width="${f(len)}" height="${f(sD)}" fill="#111"/>`
      // Mirror horizontally so shaft points left, head on right
      content = `<g transform="scale(-1,1) translate(-${f(W)},0)">${head + shaft}</g>`
      return { W, H, content }
    },
  },
}
