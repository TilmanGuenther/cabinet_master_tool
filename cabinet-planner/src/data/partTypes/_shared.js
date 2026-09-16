/**
 * Helpers shared by part type modules.
 *
 * Kept separate so a contributor writing a new part type has one obvious place
 * to find the primitives the built-in types use.
 */

/**
 * Nominal diameter in mm, parsed from a thread string.
 * Re-exported from utils/partDims.js so part type modules have one obvious
 * import for the primitives they need.
 */
export { d as nominalDiameter } from '../../utils/partDims.js'

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
