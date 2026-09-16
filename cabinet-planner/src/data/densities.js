/**
 * Bulk density: approximate pieces per ml for random loose packing.
 *
 * Design:
 *   - Nuts, washers and press-in nuts are length-independent, so they are
 *     looked up in the empirical table below.
 *   - Everything else is length-dependent and always computed geometrically,
 *     so density correctly decreases as part length increases.
 *
 * The geometry itself lives with each part type in src/data/partTypes/ -- a
 * type owns its own volume model, including the random-packing factor, so
 * adding a part type does not mean editing this file. Packing factors are
 * calibrated so the geometric formula matches empirical values at a typical
 * length of ~10 mm.
 */

import { resolvePartType } from './partTypes/index.js'

// ── Length-independent empirical table (nuts, washers, press-in nuts) ─────────────

const TABLE = {
  // Nuts — height is fixed per DIN/ISO standard
  'M2-nut':    14,  'M2.5-nut':  10,  'M3-nut':   6,   'M4-nut':   4,
  'M5-nut':   2.5,  'M6-nut':   1.5,  'M8-nut':  0.8,  'M10-nut': 0.5,

  // Washers — thickness is fixed per DIN 125 (standard) or DIN 9021 (large)
  'M2-washer':   18,  'M2.5-washer':  14,  'M3-washer':  10,  'M4-washer':  7,
  'M5-washer':    4,  'M6-washer':   2.5,  'M8-washer': 1.0,  'M10-washer': 0.5,

  // Press-in nuts (PEM KF2) — flat disc, wide flange; similar density to hex nuts
  'M2-press-nut': 10,  'M2.5-press-nut': 8,  'M3-press-nut': 6,
  'M4-press-nut':  3,  'M5-press-nut':   2,
}

// ── Public API ──────────────────────────────────────────────────────────────────────────────────

/**
 * Estimated bulk density (pieces per ml) for a part.
 *
 * Length-independent types prefer the empirical table; everything else uses
 * its part type's geometric model so that longer parts yield lower density.
 *
 * @param {object} part - part record or catalog entry. Needs `thread` and
 *                        `headType`, plus `length` for length-bearing types.
 * @returns {number} pieces per ml, rounded to one decimal, minimum 0.1
 */
export function getDensity(part) {
  const type = resolvePartType(part)

  if (type.lengthIndependent) {
    const tableVal = TABLE[`${part.thread}-${part.headType}`]
    if (tableVal != null) return tableVal
  }

  const vol = type.volumeMM3(part)
  if (vol <= 0) return 0.5
  return Math.max(0.1, Math.round((1000 / vol) * 10) / 10)
}

// Re-export the table so callers can inspect it if needed.
export { TABLE as densities }
