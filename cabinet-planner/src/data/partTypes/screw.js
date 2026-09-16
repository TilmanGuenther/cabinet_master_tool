/**
 * Part type: screw.
 *
 * The only built-in type with more than one head geometry, so `headTypes` has
 * several entries and both the volume model and the label text branch on which
 * head a part has.
 */

import { nominalDiameter, cylinderVol, genericVolMM3 } from './_shared.js'

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
   * in utils/fastenerDims.js.
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
}
