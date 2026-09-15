/**
 * fastenerDims.js
 * Dimension/proportion helpers for fastener SVG generation.
 * Pure math — no DOM dependencies.
 */

// ── Thread → nominal diameter (mm) ───────────────────────────────────────────

export const THREAD_D = { M2: 2, 'M2.5': 2.5, M3: 3, M4: 4, M5: 5, M6: 6, M8: 8, M10: 10 }

export function d(thread) { return THREAD_D[thread] ?? 3 }

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
 * Returns physical proportions for washers based on DIN norm:
 *   BN 715 → DIN 125 (standard): OD=2.25d, ID=1.08d, th=0.20d
 *   BN 729 → DIN 9021 (large):   OD=4.00d, ID=1.12d, th=0.25d
 *   BN 726 → DIN 433 (socket):   OD=2.00d, ID=1.08d, th=0.20d
 */
export function washerDims(part) {
  const nomD = d(part.thread)
  const norm = part.bossardNorm
  if (norm === 'BN 729') {
    return { outerD: nomD * 4.00, innerD: nomD * 1.12, thick: nomD * 0.25 }
  } else if (norm === 'BN 726') {
    return { outerD: nomD * 2.00, innerD: nomD * 1.08, thick: nomD * 0.20 }
  } else {
    // Default: BN 715 / DIN 125 standard washer
    return { outerD: nomD * 2.25, innerD: nomD * 1.08, thick: nomD * 0.20 }
  }
}

// ── Tiny numeric formatter ────────────────────────────────────────────────────

export function f(n) { return n.toFixed(2) }

// ── Part type helpers ─────────────────────────────────────────────────────────

/** True for DIN 562 Vierkantmuttern (square nuts). */
export function isSquareNut(part) {
  return part.bossardNorm === 'BN 145' || part.title?.includes('Vierkant')
}

/** True for M/F standoffs ("Innen- und Aussengewinde"). */
export function isMFStandoff(part) {
  return part.title?.includes('Aussengewinde')
}
