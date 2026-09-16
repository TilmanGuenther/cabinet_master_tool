import bossardDb from '../../data/bossard-db.json'
import { VARIANT_DEFS, CELL, INSET } from './dmConstants.js'
import { typeForHeadType, describePart } from '../../data/partTypes/index.js'

// ── Part assigner helpers ─────────────────────────────────────────────────────

// Re-exported so existing importers keep working; the registry owns it now.
export { typeForHeadType }

export function variantForEntry(entry) {
  const type = typeForHeadType(entry.headType)
  const variants = VARIANT_DEFS[type]
  if (!variants) return null
  return variants.find(v => v.norms.includes(entry.bossardNorm)) || null
}

export function dbFilter({ headTypes, thread, head, drive, length, bossardNorms } = {}) {
  return bossardDb.filter(p => {
    if (headTypes    && !headTypes.includes(p.headType))      return false
    if (thread       && p.thread   !== thread)                return false
    if (head         && p.headType !== head)                  return false
    if (drive        && p.drive    !== drive)                 return false
    if (length != null && p.length !== length)                return false
    if (bossardNorms && !bossardNorms.includes(p.bossardNorm)) return false
    return true
  })
}

export function uniq(arr) { return [...new Set(arr)] }

export function sortThreads(threads) {
  return threads.sort((a, b) => parseFloat(a.replace('M', '').replace('\u00D8', '')) - parseFloat(b.replace('M', '').replace('\u00D8', '')))
}

export function buildPartDescription(entry) {
  return describePart(entry, variantForEntry(entry)?.label)
}

export function dbEntryToPart(entry) {
  return {
    description:   buildPartDescription(entry),
    title:         entry.title         || '',
    bossardPN:     entry.articleNumber,
    bossardNorm:   entry.bossardNorm   || '',
    thread:        entry.thread        || '',
    headType:      entry.headType      || '',
    drive:         entry.drive         || '',
    length:        entry.length        ?? null,
    material:      entry.material      || '',
    materialGrade: entry.materialGrade || '',
    standard:      entry.norms?.[0]    || entry.bossardNorm || '',
  }
}

export function buildSelectRow(label, options, currentVal, onChange) {
  const row = mk('div', 'dm-assigner-row')
  const lbl = mk('label', 'dm-assigner-lbl')
  lbl.textContent = label

  const sel = mk('select', 'dm-assigner-sel')
  const ph  = document.createElement('option')
  ph.value       = ''
  ph.textContent = `\u2014 ${label.toLowerCase()} \u2014`
  ph.selected    = currentVal == null
  sel.appendChild(ph)

  for (const opt of options) {
    const v = typeof opt === 'string' ? opt : opt.value
    const l = typeof opt === 'string' ? opt : opt.label
    const o = document.createElement('option')
    o.value       = String(v)
    o.textContent = l
    if (currentVal != null && String(v) === String(currentVal)) o.selected = true
    sel.appendChild(o)
  }

  sel.addEventListener('change', () => onChange(sel.value || null))
  row.append(lbl, sel)
  return row
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────

export function esc(str) {
  const d = document.createElement('div')
  d.textContent = String(str ?? '')
  return d.innerHTML
}

export function uid() {
  return 'bin-' + Math.random().toString(36).slice(2, 9)
}

export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

export function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

export function hasCollision(bins, skipId, nx, ny, nw, nh) {
  return bins.some(b => b.id !== skipId && overlaps(nx, ny, nw, nh, b.x, b.y, b.w, b.h))
}

// Check whether moving a group of bins by (dx, dy) would collide with any non-group bin.
export function hasMultiCollision(allBins, selIds, dx, dy) {
  return allBins.some(b => {
    if (selIds.has(b.id)) return false   // not a target — skip
    return [...selIds].some(sid => {
      const sb = allBins.find(x => x.id === sid)
      if (!sb) return false
      return overlaps(sb.x + dx, sb.y + dy, sb.w, sb.h, b.x, b.y, b.w, b.h)
    })
  })
}

// Clamp (dx, dy) so every bin in selBins stays within the grid.
export function clampGroupDelta(selBins, dx, dy, gw, gh) {
  let cdx = dx, cdy = dy
  for (const b of selBins) {
    cdx = clamp(cdx, -b.x, gw - b.x - b.w)
    cdy = clamp(cdy, -b.y, gh - b.y - b.h)
  }
  return { dx: cdx, dy: cdy }
}

export function findDrawer(state, drawerId) {
  return state.cabinets?.flatMap(c => c.drawers).find(d => d.id === drawerId) ?? null
}

export function mk(tag, cls) {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  return e
}

export function drawerFillStats(drawer) {
  const total = (drawer.gridW || 0) * (drawer.gridH || 0)
  const occupied = new Set()
  for (const bin of drawer.bins || []) {
    for (let dy = 0; dy < bin.h; dy++) {
      for (let dx = 0; dx < bin.w; dx++) {
        occupied.add(`${bin.x + dx},${bin.y + dy}`)
      }
    }
  }
  return { filled: occupied.size, total }
}

// ── Bin clipboard validation ──────────────────────────────────────────────────
// Validates a single bin shape. Returns true if valid.
export function isValidBin(b) {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return false
  if (!Number.isInteger(b.w) || b.w < 1 || b.w > 50) return false
  if (!Number.isInteger(b.h) || b.h < 1 || b.h > 50) return false
  if (b.heightUnits !== null && b.heightUnits !== undefined) {
    if (!Number.isInteger(b.heightUnits) || b.heightUnits < 1) return false
  }
  if (b.part !== null && b.part !== undefined && (typeof b.part !== 'object' || Array.isArray(b.part))) return false
  return true
}

// Returns an array of sanitised, position-normalized bins if `text` is valid bin JSON,
// otherwise null. Accepts either a single bin object or an array of bin objects.
export function parseBinsFromClipboardText(text) {
  let obj
  try { obj = JSON.parse(text.trim()) } catch { return null }
  const arr = Array.isArray(obj) ? obj : [obj]
  if (arr.length === 0 || !arr.every(isValidBin)) return null
  // Normalize positions so the top-left of the group is at (0,0)
  const minX = Math.min(...arr.map(b => (Number.isInteger(b.x) ? b.x : 0)))
  const minY = Math.min(...arr.map(b => (Number.isInteger(b.y) ? b.y : 0)))
  return arr.map(b => ({ ...b, x: (Number.isInteger(b.x) ? b.x : 0) - minX, y: (Number.isInteger(b.y) ? b.y : 0) - minY }))
}

export function setAbsRect(el, gx, gy, gw, gh, cp) {
  el.style.left   = (gx * cp + INSET) + 'px'
  el.style.top    = (gy * cp + INSET) + 'px'
  el.style.width  = (gw * cp - INSET * 2) + 'px'
  el.style.height = (gh * cp - INSET * 2) + 'px'
}

export function updateSelBox(el, sx, sy, ex, ey, cp) {
  const rx = Math.min(sx, ex), ry = Math.min(sy, ey)
  const rw = Math.abs(ex - sx) + 1,  rh = Math.abs(ey - sy) + 1
  el.style.left   = (rx * cp) + 'px'
  el.style.top    = (ry * cp) + 'px'
  el.style.width  = (rw * cp) + 'px'
  el.style.height = (rh * cp) + 'px'
}
