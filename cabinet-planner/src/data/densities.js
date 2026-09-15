/**
 * Density calculation: approximate pieces per ml for random loose packing.
 *
 * Design:
 *   - Nuts and washers are length-independent → looked up from the empirical table.
 *   - All other types (screws, standoffs, inserts, pins, set-screws) are
 *     length-dependent → always computed geometrically so that density correctly
 *     decreases as part length increases.
 *
 * Thread prefix: "M" for threaded parts, "Ø" for smooth-shank pins/dowels.
 *
 * Packing factors are calibrated so that the geometric formula matches
 * empirical values at a typical length of ~10 mm:
 *   - Screws (socket / low-socket / button / pan / countersunk): 2.0
 *   - Set-screws (headless cylinders):                           1.3
 *   - Standoffs / inserts / pins (cylinder-dominant):            1.4
 */

// ── Length-independent empirical table (nuts and washers only) ───────────────

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

// ── Types that do not depend on length ───────────────────────────────────────

const LENGTH_INDEPENDENT = new Set(['nut', 'washer', 'press-nut'])

// ── Geometry helpers ─────────────────────────────────────────────────────────

/**
 * Parse nominal diameter from thread string.
 * Handles both "M3" (threaded) and "Ø3" (smooth-shank pins).
 */
function nominalDiameter(thread) {
  return parseFloat(String(thread).replace(/^[MØ]/i, '')) || 3
}

/**
 * Compute an effective bounding volume per part (mm³) that accounts for
 * part geometry and random-packing inefficiency.
 * Returns 1000 / result to get pieces/ml.
 */
function boundingVolMM3(headType, diam, len) {
  switch (headType) {
    case 'socket': {
      // Cylindrical head: diameter ≈ 1.5d, height ≈ 1.0d
      const headVol  = Math.PI * (diam * 0.75) ** 2 * (diam * 1.00)
      const shankVol = Math.PI * (diam / 2) ** 2 * len
      return (headVol + shankVol) * 2.0
    }
    case 'low-socket': {
      // Low-profile cylindrical head: diameter ≈ 1.5d, height ≈ 0.55d (DIN 7984)
      const headVol  = Math.PI * (diam * 0.75) ** 2 * (diam * 0.55)
      const shankVol = Math.PI * (diam / 2) ** 2 * len
      return (headVol + shankVol) * 2.0
    }
    case 'button': {
      // Dome head: diameter ≈ 2.5d, height ≈ 0.58d (ISO 7380)
      const headVol  = Math.PI * (diam * 1.25) ** 2 * (diam * 0.58)
      const shankVol = Math.PI * (diam / 2) ** 2 * len
      return (headVol + shankVol) * 2.0
    }
    case 'pan': {
      // Pan head: diameter ≈ 2.0d, height ≈ 0.70d
      const headVol  = Math.PI * (diam * 1.00) ** 2 * (diam * 0.70)
      const shankVol = Math.PI * (diam / 2) ** 2 * len
      return (headVol + shankVol) * 2.0
    }
    case 'countersunk': {
      // Tapered head (frustum): outer radius = d, inner = d/2, height ≈ 0.6d
      // Higher packing factor (2.8) because the flat wide head prevents close packing.
      const R = diam, r = diam / 2, h = diam * 0.60
      const headVol  = (Math.PI * h / 3) * (R ** 2 + R * r + r ** 2)
      const shankVol = Math.PI * (diam / 2) ** 2 * len
      return (headVol + shankVol) * 2.8
    }
    case 'set-screw': {
      // No head: plain threaded cylinder, packs well
      return Math.PI * (diam / 2) ** 2 * len * 1.3
    }
    case 'standoff': {
      // Hex standoff: across-flats ≈ 2d, hex area = (√3/4) × af²
      const hexArea = (Math.sqrt(3) / 4) * (diam * 2.0) ** 2
      return hexArea * len * 1.4
    }
    case 'insert': {
      // Heat-set / press-in insert: OD ≈ 1.7d
      return Math.PI * (diam * 0.85) ** 2 * len * 1.4
    }
    case 'pin': {
      // Smooth cylindrical/dowel pin (ISO 2338): diameter = nominal d
      return Math.PI * (diam / 2) ** 2 * len * 1.4
    }
    case 'nut': {
      // Hex nut: across-flats ≈ 1.74d, height ≈ 0.8d (used by geometric fallback only)
      const hexArea = (Math.sqrt(3) / 4) * (diam * 1.74) ** 2
      return hexArea * (diam * 0.8) * 1.3
    }
    case 'washer': {
      // Standard washer DIN 125: OD ≈ 2.25d, ID ≈ 1.08d, thickness ≈ 0.2d
      const washVol = Math.PI * ((diam * 1.125) ** 2 - (diam * 0.54) ** 2) * (diam * 0.20)
      return washVol * 2.5   // washers orient randomly; generous packing penalty
    }
    case 'press-nut': {
      // Flat disc: flange OD ≈ 1.85d, total height ≈ 1.05d; packs like a nut
      const vol = Math.PI * (diam * 0.925) ** 2 * (diam * 1.05)
      return vol * 1.5
    }
    default: {
      // Generic: treat as a cylinder with a conservative packing factor
      return Math.PI * (diam / 2) ** 2 * len * 1.8
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return the estimated bulk density (pieces per ml) for a part.
 *
 * For length-independent types (nut, washer) the empirical table is preferred.
 * For all other types the geometric formula is always used so that density
 * scales correctly with part length — longer parts yield lower density.
 *
 * @param {string} thread   - e.g. "M3" or "Ø3" (smooth-shank pins)
 * @param {string} headType - e.g. "socket", "nut", "washer", "pin"
 * @param {number} [length] - part length in mm (strongly recommended for screws)
 * @returns {number} pieces per ml, rounded to one decimal place, minimum 0.1
 */
export function getDensity(thread, headType, length) {
  // Length-independent types: empirical table first, then geometric fallback.
  if (LENGTH_INDEPENDENT.has(headType)) {
    const tableVal = TABLE[`${thread}-${headType}`]
    if (tableVal != null) return tableVal
  }

  const diam = nominalDiameter(thread)
  const len  = length || 10   // fall back to 10 mm when length is unknown

  const bv = boundingVolMM3(headType, diam, len)
  if (bv <= 0) return 0.5
  return Math.max(0.1, Math.round((1000 / bv) * 10) / 10)
}

// Re-export the table so callers can inspect it if needed.
export { TABLE as densities }
