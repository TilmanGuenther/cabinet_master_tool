/**
 * Part type: unthreaded spacer.
 *
 * A plain tube used to set a gap. Distinct from a standoff, which is threaded
 * at one or both ends; a spacer has a clearance bore straight through.
 */

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
}

function sizeText(part) {
  if (part.outerD == null) return ''
  const bore = part.innerD != null ? `/Ø${part.innerD}` : ''
  const len  = part.length != null ? `×${part.length}` : ''
  return `Ø${part.outerD}${bore}${len}`
}
