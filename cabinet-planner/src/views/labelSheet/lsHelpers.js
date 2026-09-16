/**
 * Shared utilities for the LabelSheet view.
 */

import { shortLabel } from '../../data/partTypes/index.js'

// Gridfinity cell pitch (mm)
export const CELL_MM = 42
// Label height is constant (mm)
export const LABEL_H_MM = 11
// Per-cell label width: cell pitch minus margin on each side
export function labelWidthMM(binW) { return (binW || 1) * CELL_MM - 6 }

// ── Key helpers ───────────────────────────────────────────────────────────────

export function binKey(cabId, drawId, binId) { return `${cabId}::${drawId}::${binId}` }

export function parseBinKey(key) {
  const parts = key.split('::')
  return { cabId: parts[0], drawId: parts[1], binId: parts[2] }
}

export function findBinInState(s, cabId, drawId, binId) {
  const cab    = s.cabinets?.find(c => c.id === cabId)
  const drawer = cab?.drawers?.find(d => d.id === drawId)
  return drawer?.bins?.find(b => b.id === binId) ?? null
}

// ── DOM helper ────────────────────────────────────────────────────────────────

export function mk(tag, cls) {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  return el
}

// ── HTML escaping ─────────────────────────────────────────────────────────────

export function esc(str) {
  const d = document.createElement('div')
  d.textContent = str
  return d.innerHTML
}

/**
 * Compact one-line description for a bin label.
 * The per-type wording lives with each part type in src/data/partTypes/.
 */
export function formatDesc(part) {
  return shortLabel(part)
}
