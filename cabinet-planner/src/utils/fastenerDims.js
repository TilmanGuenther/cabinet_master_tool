/**
 * fastenerDims.js
 * Dimension/proportion helpers for fastener SVG generation.
 * Pure math — no DOM dependencies.
 */

// ── Thread → nominal diameter (mm) ───────────────────────────────────────────

/**
 * Nominal diameter in mm for a thread designation.
 *
 * Handles "M3" (threaded) and "Ø3" (smooth-shank pins and dowels); the 3 mm
 * default applies only to something that parses as neither.
 *
 * This used to be a lookup table covering M2-M10, which silently returned 3 mm
 * for every other size -- about a fifth of the catalog, so an M16 screw and an
 * M36 washer were drawn the same size as an M3 (finding F-1 in
 * doc/CATALOG_PLUGIN_PLAN.md).
 */
export function d(thread) {
  return parseFloat(String(thread).replace(/^[MØ]/i, '')) || 3
}

// ── Real-world mm proportions (approximate DIN/ISO) ──────────────────────────

export function screwDims(headType, nomD) {
  switch (headType) {
    case 'socket':      return { headW: nomD * 1.50, headH: nomD * 1.00 }
    case 'low-socket':  return { headW: nomD * 1.50, headH: nomD * 0.55 }
    case 'button':      return { headW: nomD * 2.50, headH: nomD * 0.58 }
    case 'countersunk': return { headW: nomD * 2.00, headH: nomD * 0.60 }
    case 'pan':         return { headW: nomD * 2.00, headH: nomD * 0.70 }
    default:            return { headW: nomD * 1.60, headH: nomD * 0.90 }
  }
}

/**
 * Physical proportions for a washer, by variant:
 *   washer-std    DIN 125:  OD=2.25d, ID=1.08d, th=0.20d
 *   washer-large  DIN 9021: OD=4.00d, ID=1.12d, th=0.25d
 *   washer-socket DIN 433:  OD=2.00d, ID=1.08d, th=0.20d
 */
export function washerDims(part) {
  const nomD = d(part.thread)
  switch (washerVariant(part)) {
    case 'washer-large':  return { outerD: nomD * 4.00, innerD: nomD * 1.12, thick: nomD * 0.25 }
    case 'washer-socket': return { outerD: nomD * 2.00, innerD: nomD * 1.08, thick: nomD * 0.20 }
    default:              return { outerD: nomD * 2.25, innerD: nomD * 1.08, thick: nomD * 0.20 }
  }
}

// ── Tiny numeric formatter ────────────────────────────────────────────────────

export function f(n) { return n.toFixed(2) }

// ── Shape discriminators ──────────────────────────────────────────────
//
// How a part is drawn depends on facts the catalog now states outright, in
// `variant` and `shape`. Each of these used to guess from Bossard norm numbers
// and German title text, which silently mis-drew any catalog in another
// language: a large washer as a standard one, a square nut as hex, an M/F
// standoff as F/F.
//
// The old guess survives only as a fallback for part records written before
// those fields existed. Catalogs are expected to state them, and
// `npm run validate` warns when one does not.

function washerVariant(part) {
  if (part.variant) return part.variant
  // Legacy: BN 729 = DIN 9021 (large), BN 726 = DIN 433 (socket head).
  if (part.bossardNorm === 'BN 729') return 'washer-large'
  if (part.bossardNorm === 'BN 726') return 'washer-socket'
  return 'washer-std'
}

/** True for square nuts (DIN 562) rather than hex. */
export function isSquareNut(part) {
  if (part.shape?.nutShape) return part.shape.nutShape === 'square'
  return Boolean(part.bossardNorm === 'BN 145' || part.title?.includes('Vierkant'))
}

/** True for standoffs with a male stud at one end ("Innen- und Aussengewinde"). */
export function isMFStandoff(part) {
  if (part.shape?.standoffEnds) return part.shape.standoffEnds === 'mf'
  return Boolean(part.title?.includes('Aussengewinde'))
}

/** True for nuts with a nylon insert (DIN 985), which stand taller than plain nuts. */
export function isNylocNut(part) {
  if (part.shape?.locking) return part.shape.locking === 'nylon'
  return Boolean(
    part.description?.toLowerCase().includes('nyloc') || part.standard?.includes('985'),
  )
}
