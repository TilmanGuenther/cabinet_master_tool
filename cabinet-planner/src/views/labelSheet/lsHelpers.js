/**
 * Shared utilities for the LabelSheet view.
 */

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

/** Build a concise, consistent description from part fields. */
export function formatDesc(part) {
  const thread = part.thread || ''
  const ht     = part.headType || ''
  const length = part.length

  if (ht === 'nut') {
    const nyloc = part.description?.toLowerCase().includes('nyloc') || part.standard?.includes('985')
    return `${thread} ${nyloc ? 'Nyloc Nut' : 'Hex Nut'}`
  }
  if (ht === 'washer')  return `${thread} Washer`
  if (ht === 'standoff') return `${thread}${length ? '\u00D7' + length : ''} · Standoff`
  if (ht === 'pin')      return `${thread}${length ? '\u00D7' + length : ''} · Pin`

  if (thread || ht) {
    const HEAD = {
      socket: 'Socket', 'low-socket': 'Low Socket',
      button: 'Button', countersunk: 'Countersunk',
      pan: 'Pan', flat: 'Flat',
    }
    const headLabel = HEAD[ht] || ht
    const drive = part.drive || ''
    const size  = thread + (length ? '\u00D7' + length : '')
    return [size, headLabel, drive].filter(Boolean).join(' · ')
  }

  return part.description || ''
}
