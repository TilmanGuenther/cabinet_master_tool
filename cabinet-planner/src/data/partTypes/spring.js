/**
 * Part type: helical spring.
 *
 * Sized by outer diameter, free length and wire diameter. Compression,
 * extension and torsion springs differ enough to be separate variants.
 */

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
}

function sizeText(part) {
  if (part.outerD == null) return ''
  const len = part.freeLength != null ? `×${part.freeLength}` : ''
  return `Ø${part.outerD}${len}`
}
