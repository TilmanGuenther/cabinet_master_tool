/**
 * Helpers shared by part type modules.
 *
 * Kept separate so a contributor writing a new part type has one obvious place
 * to find the primitives the built-in types use.
 */

/**
 * Nominal diameter in mm, parsed from a thread string.
 * Handles both "M3" (threaded) and "Ø3" (smooth-shank pins and dowels).
 *
 * Note this is NOT the same as `d()` in utils/fastenerDims.js, which looks the
 * thread up in a table that only covers M2-M10 and silently returns 3 mm for
 * anything else (finding F-1 in doc/CATALOG_PLUGIN_PLAN.md). The two converge
 * when F-1 is fixed.
 */
export function nominalDiameter(thread) {
  return parseFloat(String(thread).replace(/^[MØ]/i, '')) || 3
}

/** Cross-sectional area of a hexagon given its across-flats dimension. */
export function hexArea(acrossFlats) {
  return (Math.sqrt(3) / 4) * acrossFlats ** 2
}

/** Volume of a cylinder of diameter `diam` and length `len`. */
export function cylinderVol(diam, len) {
  return Math.PI * (diam / 2) ** 2 * len
}

/**
 * Fallback packed volume for a part whose type has no specific model:
 * a plain cylinder with a conservative packing penalty.
 */
export function genericVolMM3(diam, len) {
  return cylinderVol(diam, len) * 1.8
}
