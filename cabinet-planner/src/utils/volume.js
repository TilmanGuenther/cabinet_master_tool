/**
 * Bin volume and fill calculations for Gridfinity bins.
 *
 * Physical constants:
 *   - Gridfinity base unit: 42mm x 42mm
 *   - Height unit: 7mm per unit
 *   - Wall thickness reduction: ~15% of gross volume
 */

const GRID_UNIT_MM = 42
const HEIGHT_UNIT_MM = 7
const WALL_FACTOR = 0.85 // 15% reduction for bin walls

/**
 * Calculate the usable internal volume of a Gridfinity bin in ml.
 * @param {number} w - width in grid units
 * @param {number} h - depth in grid units
 * @param {number} heightUnits - height in 7mm units
 * @returns {number} volume in ml
 */
export function binVolumeML(w, h, heightUnits) {
  const grossMM3 = (w * GRID_UNIT_MM) * (h * GRID_UNIT_MM) * (heightUnits * HEIGHT_UNIT_MM)
  const netMM3 = grossMM3 * WALL_FACTOR
  return netMM3 / 1000 // mm³ → ml (1 ml = 1000 mm³)
}

/**
 * Calculate target piece count for a bin.
 * Formula: volume_ml × density_pcs_per_ml × 0.8 (80% fill target)
 * @param {number} volumeML - bin volume in ml
 * @param {number} densityPcsPerML - pieces per ml from density table
 * @returns {number} target piece count (rounded)
 */
export function targetPieceCount(volumeML, densityPcsPerML) {
  return Math.round(volumeML * densityPcsPerML * 0.8)
}
