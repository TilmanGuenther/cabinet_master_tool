import { updateState, getState } from '../../state.js'
import { findBySku } from '../../data/catalogs/index.js'
import { nextAlongCascade } from './dmCascade.js'
import { pushHistory, undo as undoHistory, redo as redoHistory } from '../../utils/binHistory.js'
import {
  getSelDrawerId, getSelBinIds, getKeyHandler, getMouseGridCell, getClipboardBins, getCreateMode, getZoom,
  setSelBinIds, setKeyHandler, setClipboardBins, setCreateMode, setZoom, setPartSel,
  selBinId, rerender,
} from './dmState.js'
import {
  findDrawer, clamp, clampGroupDelta, hasMultiCollision, hasCollision, overlaps, uid,
  parseBinsFromClipboardText, dbEntryToPart,
} from './dmHelpers.js'
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from './dmConstants.js'

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

export function setupKeybinds() {
  const _keyHandler = getKeyHandler()
  if (_keyHandler) document.removeEventListener('keydown', _keyHandler)

  const handler = (e) => {
    // Only active when DrawerMap is the current view
    if (!document.querySelector('.dm-layout')) return
    // Don't steal keys from form elements
    const tag = document.activeElement?.tagName
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return

    const state = getState()
    const _selDrawerId = getSelDrawerId()
    const _selBinIds = getSelBinIds()

    // ── Tab / Shift+Tab: cycle bin selection within the current drawer ─────
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && _selDrawerId) {
      const drawer = findDrawer(state, _selDrawerId)
      if (!drawer?.bins?.length) return
      e.preventDefault()
      const bins = drawer.bins
      const currentId = selBinId()
      const idx = currentId ? bins.findIndex(b => b.id === currentId) : -1
      const nextIdx = e.shiftKey
        ? (idx <= 0 ? bins.length - 1 : idx - 1)
        : (idx >= bins.length - 1 ? 0 : idx + 1)
      setSelBinIds(new Set([bins[nextIdx].id]))
      setPartSel({})
      document.dispatchEvent(new Event('dm-rerender'))
      return
    }

    // ── Escape: deselect all bins ──────────────────────────────────────────
    if (e.key === 'Escape' && _selBinIds.size > 0) {
      e.preventDefault()
      _selBinIds.clear()
      document.dispatchEvent(new Event('dm-rerender'))
      return
    }

    // ── Zoom: +/= zoom in, - zoom out, 0 reset ────────────────────────────
    if ((e.key === '+' || e.key === '=') && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      e.preventDefault()
      setZoom(Math.min(ZOOM_MAX, +(getZoom() + ZOOM_STEP).toFixed(2)))
      rerender()
      return
    }
    if (e.key === '-' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      e.preventDefault()
      setZoom(Math.max(ZOOM_MIN, +(getZoom() - ZOOM_STEP).toFixed(2)))
      rerender()
      return
    }
    if (e.key === '0' && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      setZoom(1.0)
      rerender()
      return
    }

    // ── Space: toggle draw mode ────────────────────────────────────────────
    if (e.key === ' ' && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      setCreateMode(!getCreateMode())
      rerender()
      return
    }

    // ── A: select all bins in current drawer ──────────────────────────────
    if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.altKey && _selDrawerId) {
      const drawer = findDrawer(state, _selDrawerId)
      if (!drawer?.bins?.length) return
      e.preventDefault()
      setSelBinIds(new Set(drawer.bins.map(b => b.id)))
      setPartSel({})
      document.dispatchEvent(new Event('dm-rerender'))
      return
    }

    // ── Ctrl+V: paste bin(s) into the grid at the cursor position ────────
    // Prefers system clipboard so externally-edited JSON is picked up;
    // falls back to the internal _clipboardBins when clipboard API is unavailable.
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      if (!_selDrawerId || !getMouseGridCell()) return
      e.preventDefault()

      // Capture position/drawer now before any async gap
      const targetCell = { ...getMouseGridCell() }
      const drawerId = _selDrawerId

      // binsData: array of bins with x,y already normalized to 0,0 origin.
      // Places the group's top-left at the cursor position (clamped to fit).
      const doPaste = (binsData) => {
        const drawer0 = findDrawer(getState(), drawerId)
        if (!drawer0) return
        const gw0 = drawer0.gridW || 13
        const gh0 = drawer0.gridH || 13
        const groupW = Math.max(...binsData.map(b => b.x + b.w))
        const groupH = Math.max(...binsData.map(b => b.y + b.h))
        const ax = clamp(targetCell.x, 0, gw0 - groupW)
        const ay = clamp(targetCell.y, 0, gh0 - groupH)
        const newBins = binsData.map(b => ({
          ...JSON.parse(JSON.stringify(b)),
          id: uid(),
          x: ax + b.x,
          y: ay + b.y,
        }))
        // Reject if any new bin collides with an existing bin
        const blocked = newBins.some(nb => hasCollision(drawer0.bins, null, nb.x, nb.y, nb.w, nb.h))
        if (blocked) return
        setSelBinIds(new Set(newBins.map(b => b.id)))
        pushHistory(drawer0.id, drawer0.bins)
        updateState(s => {
          const dr = findDrawer(s, drawer0.id)
          if (dr) for (const nb of newBins) dr.bins.push(nb)
        })
      }

      if (navigator.clipboard?.readText) {
        navigator.clipboard.readText().then(text => {
          const parsed = parseBinsFromClipboardText(text)
          if (parsed) {
            setClipboardBins(parsed)   // keep internal clipboard in sync
            doPaste(parsed)
          } else if (getClipboardBins()) {
            doPaste(getClipboardBins())
          }
        }).catch(() => {
          if (getClipboardBins()) doPaste(getClipboardBins())
        })
      } else if (getClipboardBins()) {
        doPaste(getClipboardBins())
      }
      return
    }

    // ── Ctrl+Z: Undo ─────────────────────────────────────────────────────
    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (!_selDrawerId) return
      e.preventDefault()
      const undoDrawer = findDrawer(getState(), _selDrawerId)
      if (!undoDrawer) return
      const prev = undoHistory(_selDrawerId, undoDrawer.bins)
      if (prev !== null) {
        updateState(s => {
          const dr = findDrawer(s, _selDrawerId)
          if (dr) dr.bins = prev
        })
      }
      return
    }

    // ── Ctrl+Y / Ctrl+Shift+Z: Redo ──────────────────────────────────────
    if ((e.key === 'y' && (e.ctrlKey || e.metaKey) && !e.shiftKey) ||
        (e.key === 'Z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
      if (!_selDrawerId) return
      e.preventDefault()
      const redoDrawer = findDrawer(getState(), _selDrawerId)
      if (!redoDrawer) return
      const next = redoHistory(_selDrawerId, redoDrawer.bins)
      if (next !== null) {
        updateState(s => {
          const dr = findDrawer(s, _selDrawerId)
          if (dr) dr.bins = next
        })
      }
      return
    }

    if (_selBinIds.size === 0 || !_selDrawerId) return

    const drawer = findDrawer(state, _selDrawerId)
    if (!drawer) return

    // ── Delete / Backspace: delete selected bin(s) ────────────────────────
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      const ids = new Set(_selBinIds)
      _selBinIds.clear()
      pushHistory(_selDrawerId, drawer.bins)
      updateState(s => {
        const dr = findDrawer(s, _selDrawerId)
        if (dr) dr.bins = dr.bins.filter(b => !ids.has(b.id))
      })
      return
    }

    // ── Ctrl+C: copy selected bin(s) to clipboard ───────────────────────
    if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      const selBins = drawer.bins.filter(b => _selBinIds.has(b.id))
      if (selBins.length === 0) return
      const minX = Math.min(...selBins.map(b => b.x))
      const minY = Math.min(...selBins.map(b => b.y))
      // Normalize positions so the group's top-left is at (0,0)
      setClipboardBins(selBins.map(b => ({ ...JSON.parse(JSON.stringify(b)), x: b.x - minX, y: b.y - minY })))
      navigator.clipboard?.writeText(JSON.stringify(getClipboardBins(), null, 2)).catch(() => {})
      return
    }

    // ── Shift+D: duplicate single selected bin ────────────────────────────
    if (e.key === 'D' && e.shiftKey && !e.ctrlKey) {
      const singleId = selBinId()
      if (!singleId) return
      e.preventDefault()
      const bin = drawer.bins.find(b => b.id === singleId)
      if (bin) duplicateBin(bin, drawer, null)
      return
    }

    // ── H / Shift+H: increase / decrease bin height units (single sel) ────
    if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.altKey) {
      const singleId = selBinId()
      if (!singleId) return
      e.preventDefault()
      const bin = drawer.bins.find(b => b.id === singleId)
      if (!bin) return
      const maxH    = drawer.maxHeightUnits ?? 8
      const current = bin.heightUnits ?? (drawer.defaultHeightUnits ?? 1)
      const next    = clamp(current + (e.shiftKey ? -1 : 1), 1, maxH)
      if (next === current) return
      pushHistory(_selDrawerId, drawer.bins)
      updateState(s => {
        const dr = findDrawer(s, _selDrawerId)
        const b  = dr?.bins.find(b => b.id === singleId)
        if (b) b.heightUnits = next
      })
      return
    }

    // ── Arrow keys: move / resize / shrink ────────────────────────────────
    const arrowMap = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const arrowDir = arrowMap[e.key]
    if (!arrowDir) return

    e.preventDefault()
    const [adx, ady] = arrowDir
    const gw = drawer.gridW || 13
    const gh = drawer.gridH || 13

    // Shift+Arrow: expand all selected bins one cell in that direction
    if (e.shiftKey && !e.ctrlKey) {
      const proposals = new Map()
      for (const b of drawer.bins) {
        if (!_selBinIds.has(b.id)) continue
        let { x: nx, y: ny, w: nw, h: nh } = b
        if      (adx === -1) { nx -= 1; nw += 1 }  // expand left edge left
        else if (adx ===  1) {          nw += 1 }  // expand right edge right
        else if (ady === -1) { ny -= 1; nh += 1 }  // expand top edge up
        else if (ady ===  1) {          nh += 1 }  // expand bottom edge down
        if (nx < 0 || ny < 0 || nx + nw > gw || ny + nh > gh) return
        proposals.set(b.id, { x: nx, y: ny, w: nw, h: nh })
      }
      if (proposals.size === 0) return
      // Build the full updated bins array and check for any overlaps
      const newBins = drawer.bins.map(b => proposals.has(b.id) ? { ...b, ...proposals.get(b.id) } : b)
      const hasOverlap = newBins.some((a, i) =>
        newBins.some((c, j) => i < j && overlaps(a.x, a.y, a.w, a.h, c.x, c.y, c.w, c.h))
      )
      if (hasOverlap) return
      pushHistory(_selDrawerId, drawer.bins)
      updateState(s => {
        const dr = findDrawer(s, _selDrawerId)
        if (!dr) return
        for (const [id, bounds] of proposals) {
          const b = dr.bins.find(b => b.id === id)
          if (b) { b.x = bounds.x; b.y = bounds.y; b.w = bounds.w; b.h = bounds.h }
        }
      })
      return
    }

    // Ctrl+Arrow: shrink all selected bins one cell from that direction (Inverted controls)
    if (e.ctrlKey && !e.shiftKey) {
      const proposals = new Map()
      for (const b of drawer.bins) {
        if (!_selBinIds.has(b.id)) continue
        let { x: nx, y: ny, w: nw, h: nh } = b
        if      (adx === -1) {          nw -= 1 }  // shrink right edge inward
        else if (adx ===  1) { nx += 1; nw -= 1 }  // shrink left edge inward
        else if (ady === -1) {          nh -= 1 }  // shrink bottom edge inward
        else if (ady ===  1) { ny += 1; nh -= 1 }  // shrink top edge inward
        if (nw < 1 || nh < 1) return   // any bin would shrink below minimum
        proposals.set(b.id, { x: nx, y: ny, w: nw, h: nh })
      }
      if (proposals.size === 0) return
      // Shrinking can't cause new inter-selected overlaps; only check against non-selected bins
      const nonSel = drawer.bins.filter(b => !_selBinIds.has(b.id))
      for (const [, bounds] of proposals) {
        if (nonSel.some(b => overlaps(bounds.x, bounds.y, bounds.w, bounds.h, b.x, b.y, b.w, b.h))) return
      }
      pushHistory(_selDrawerId, drawer.bins)
      updateState(s => {
        const dr = findDrawer(s, _selDrawerId)
        if (!dr) return
        for (const [id, bounds] of proposals) {
          const b = dr.bins.find(b => b.id === id)
          if (b) { b.x = bounds.x; b.y = bounds.y; b.w = bounds.w; b.h = bounds.h }
        }
      })
      return
    }

    // Plain arrow: move selected bin(s)
    const selBins = drawer.bins.filter(b => _selBinIds.has(b.id))
    const { dx, dy } = clampGroupDelta(selBins, adx, ady, gw, gh)
    if (dx === 0 && dy === 0) return
    if (hasMultiCollision(drawer.bins, _selBinIds, dx, dy)) return
    pushHistory(drawer.id, drawer.bins)
    updateState(s => {
      const dr = findDrawer(s, drawer.id)
      if (!dr) return
      for (const sb of selBins) {
        const b = dr.bins.find(b => b.id === sb.id)
        if (b) { b.x += dx; b.y += dy }
      }
    })
  }

  setKeyHandler(handler)
  document.addEventListener('keydown', handler)
}

export function duplicateBin(bin, drawer, _panel) {
  const newX = bin.x + bin.w
  const gw   = drawer.gridW || 13
  const fits = newX + bin.w <= gw && !hasCollision(drawer.bins, null, newX, bin.y, bin.w, bin.h)

  if (!fits) {
    const s = document.getElementById('dm-dup-status')
    if (s) {
      s.textContent = 'No space to the right'
      s.classList.add('dm-status--err')
      setTimeout(() => {
        if (s) { s.textContent = ''; s.classList.remove('dm-status--err') }
      }, 2200)
    }
    return
  }

  const newBin = { ...JSON.parse(JSON.stringify(bin)), id: uid(), x: newX }

  // Duplicating a part steps one along its size range: an M3x8 screw becomes an
  // M3x10. The part type decides which dimension that is.
  if (newBin.part?.bossardPN) {
    const currentEntry = findBySku(newBin.part.supplier, newBin.part.bossardPN)
    if (currentEntry) {
      const nextEntry = nextAlongCascade(currentEntry)
      if (nextEntry) newBin.part = dbEntryToPart(nextEntry)
    }
  }

  setSelBinIds(new Set([newBin.id]))
  pushHistory(drawer.id, drawer.bins)
  updateState(s => {
    findDrawer(s, drawer.id)?.bins.push(newBin)
  })
}
