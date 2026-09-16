import { updateState, getState } from '../../state.js'
import { findBySku } from '../../data/catalogs/index.js'
import { partIdentity, partSku, skuLabel } from '../../utils/partIdentity.js'
import { makeFastenerSVGEl } from '../../utils/fastenerSvg.js'
import { pushHistory, canUndo, canRedo, undo as undoHistory, redo as redoHistory } from '../../utils/binHistory.js'
import {
  getSelDrawerId, setSelDrawerId, getSelBinIds, setSelBinIds,
  getCreateMode, setCreateMode, getZoom, setZoom,
  setMouseGridCell, getPartSel, setPartSel,
  selBinId, rerender,
} from './dmState.js'
import {
  findDrawer, clamp, clampGroupDelta, hasMultiCollision, hasCollision, overlaps,
  uid, esc, mk, drawerFillStats, setAbsRect, updateSelBox,
  typeForHeadType, variantForEntry, dbFilter,
  buildPartDescription, dbEntryToPart, buildSelectRow,
} from './dmHelpers.js'
import { buildCascade, selectionAfter } from './dmCascade.js'
import { CELL, INSET, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, TYPE_DEFS } from './dmConstants.js'
import { duplicateBin } from './dmKeybinds.js'

// ═══════════════════════════════════════════════════════════════════════════════
// LEFT PANEL — Cabinet Navigation
// ═══════════════════════════════════════════════════════════════════════════════

export function buildNav(panel, state) {
  const heading = mk('div', 'dm-heading')
  heading.textContent = 'Cabinets'
  panel.appendChild(heading)

  if (!(state.cabinets?.length)) {
    const empty = mk('div', 'dm-empty')
    empty.textContent = 'No cabinets configured.'
    panel.appendChild(empty)
    return
  }

  for (const cabinet of state.cabinets) {
    const block = mk('div', 'dm-cab-block')

    const name = mk('div', 'dm-cab-name')
    name.textContent = cabinet.name || cabinet.id
    block.appendChild(name)

    block.appendChild(buildCabinetVisual(cabinet))
    panel.appendChild(block)
  }
}

function buildCabinetVisual(cabinet) {
  const drawers = [...(cabinet.drawers || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const totalH  = drawers.reduce((s, d) => s + (d.frontHeight || 75), 0) || 600
  const scale   = Math.min(0.5, 240 / totalH)

  const wrap = mk('div', 'dm-cab-visual')

  for (const dr of drawers) {
    const chipH = Math.max(Math.round((dr.frontHeight || 75) * scale), 26)
    const chip  = mk('div', 'dm-drawer-chip' + (dr.id === getSelDrawerId() ? ' dm-drawer-chip--active' : ''))
    chip.style.height = chipH + 'px'
    chip.style.backgroundColor = dr.color || '#b0b8c1'

    const lbl = mk('span', 'dm-chip-lbl')
    lbl.textContent = dr.label || dr.id
    chip.appendChild(lbl)

    const { filled, total } = drawerFillStats(dr)
    const binCount = (dr.bins || []).length
    const fillPct  = total > 0 ? Math.round((filled / total) * 100) : 0
    const stats = mk('span', 'dm-chip-stats')
    stats.textContent = `${binCount} bin${binCount !== 1 ? 's' : ''} · ${fillPct}%`
    chip.appendChild(stats)

    chip.addEventListener('click', () => {
      setSelDrawerId(dr.id)
      getSelBinIds().clear()
      rerender()
    })

    wrap.appendChild(chip)
  }
  return wrap
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLE PANEL — Grid Workspace
// ═══════════════════════════════════════════════════════════════════════════════

export function buildWorkspace(panel, state) {
  const drawer = findDrawer(state, getSelDrawerId())
  const cp = Math.round(CELL * getZoom())   // cell pixels at current zoom

  const heading = mk('div', 'dm-heading')

  if (!drawer) {
    heading.textContent = 'Workspace'
    panel.appendChild(heading)
    const empty = mk('div', 'dm-empty')
    empty.textContent = 'Select a drawer from the left panel to begin editing.'
    panel.appendChild(empty)
    return
  }

  // Remove any selected IDs that no longer belong to this drawer
  if (getSelBinIds().size > 0) {
    const drawerBinIds = new Set((drawer.bins || []).map(b => b.id))
    for (const id of getSelBinIds()) if (!drawerBinIds.has(id)) getSelBinIds().delete(id)
  }

  heading.innerHTML =
    `${esc(drawer.label || drawer.id)}&ensp;` +
    `<span class="dm-heading-sub">${drawer.gridW ?? 13}\u202F×\u202F${drawer.gridH ?? 13} grid · ${drawer.frontHeight}mm front</span>`
  panel.appendChild(heading)

  // ── Toolbar ────────────────────────────────────────────────────────────────
  const toolbar = mk('div', 'dm-workspace-toolbar')

  // Draw mode toggle
  const toggleBtn = mk('button', `btn dm-create-toggle${getCreateMode() ? ' dm-create-toggle--on' : ''}`)
  toggleBtn.textContent = getCreateMode() ? '✏ Draw mode: ON' : '✏ Draw mode: OFF'
  toggleBtn.title = 'Toggle draw mode to create new bins by dragging'
  toggleBtn.addEventListener('click', () => {
    setCreateMode(!getCreateMode())
    rerender()
  })
  toolbar.appendChild(toggleBtn)

  toolbar.appendChild(mk('span', 'dm-toolbar-sep'))

  // Undo / Redo buttons
  const undoBtn = mk('button', 'btn dm-zoom-btn')
  undoBtn.textContent = '↩'
  undoBtn.title = 'Undo (Ctrl+Z)'
  undoBtn.disabled = !canUndo(drawer.id)
  undoBtn.addEventListener('click', () => {
    const cur = findDrawer(getState(), drawer.id)
    if (!cur) return
    const prev = undoHistory(drawer.id, cur.bins)
    if (prev !== null) {
      updateState(s => {
        const dr = findDrawer(s, drawer.id)
        if (dr) dr.bins = prev
      })
    }
  })

  const redoBtn = mk('button', 'btn dm-zoom-btn')
  redoBtn.textContent = '↪'
  redoBtn.title = 'Redo (Ctrl+Y / Ctrl+Shift+Z)'
  redoBtn.disabled = !canRedo(drawer.id)
  redoBtn.addEventListener('click', () => {
    const cur = findDrawer(getState(), drawer.id)
    if (!cur) return
    const next = redoHistory(drawer.id, cur.bins)
    if (next !== null) {
      updateState(s => {
        const dr = findDrawer(s, drawer.id)
        if (dr) dr.bins = next
      })
    }
  })

  const undoRedoWrap = mk('div', 'dm-toolbar-group')
  undoRedoWrap.append(undoBtn, redoBtn)
  toolbar.appendChild(undoRedoWrap)

  toolbar.appendChild(mk('span', 'dm-toolbar-sep'))

  // Default height spinner
  const defaultH = drawer.defaultHeightUnits ?? 6
  const maxH     = drawer.maxHeightUnits ?? 8

  const heightWrap = mk('div', 'dm-toolbar-group')
  const heightLbl  = mk('span', 'dm-toolbar-label')
  heightLbl.textContent = 'Height:'

  const heightInput = mk('input')
  heightInput.type      = 'number'
  heightInput.className = 'dm-height-spinner'
  heightInput.min       = 1
  heightInput.max       = maxH
  heightInput.value     = defaultH
  heightInput.title     = `Default bin height in Gridfinity units (1–${maxH})`
  heightInput.addEventListener('change', () => {
    const val = clamp(parseInt(heightInput.value, 10) || 1, 1, maxH)
    heightInput.value = val
    updateState(s => {
      const dr = findDrawer(s, drawer.id)
      if (dr) dr.defaultHeightUnits = val
    })
  })

  const heightUnit = mk('span', 'dm-toolbar-unit')
  heightUnit.textContent = `U (max\u202F${maxH})`

  heightWrap.append(heightLbl, heightInput, heightUnit)
  toolbar.appendChild(heightWrap)

  toolbar.appendChild(mk('span', 'dm-toolbar-sep'))

  // Zoom controls
  const zoomWrap   = mk('div', 'dm-toolbar-group')
  const zoomOutBtn = mk('button', 'btn dm-zoom-btn')
  zoomOutBtn.textContent = '−'
  zoomOutBtn.title   = 'Zoom out'
  zoomOutBtn.disabled = getZoom() <= ZOOM_MIN
  zoomOutBtn.addEventListener('click', () => {
    setZoom(Math.max(ZOOM_MIN, +(getZoom() - ZOOM_STEP).toFixed(2)))
    rerender()
  })

  const zoomLabel = mk('span', 'dm-zoom-label')
  zoomLabel.textContent = Math.round(getZoom() * 100) + '%'

  const zoomInBtn  = mk('button', 'btn dm-zoom-btn')
  zoomInBtn.textContent = '+'
  zoomInBtn.title   = 'Zoom in'
  zoomInBtn.disabled = getZoom() >= ZOOM_MAX
  zoomInBtn.addEventListener('click', () => {
    setZoom(Math.min(ZOOM_MAX, +(getZoom() + ZOOM_STEP).toFixed(2)))
    rerender()
  })

  const zoomResetBtn = mk('button', 'btn dm-zoom-btn dm-zoom-reset')
  zoomResetBtn.textContent = '↺'
  zoomResetBtn.title = 'Reset zoom to 100%'
  zoomResetBtn.disabled = getZoom() === 1.0
  zoomResetBtn.addEventListener('click', () => {
    setZoom(1.0)
    rerender()
  })

  zoomWrap.append(zoomOutBtn, zoomLabel, zoomInBtn, zoomResetBtn)
  toolbar.appendChild(zoomWrap)

  panel.appendChild(toolbar)

  // ── Grid ──────────────────────────────────────────────────────────────────
  const gw = drawer.gridW || 13
  const gh = drawer.gridH || 13

  const grid = mk('div', 'dm-grid')
  grid.style.width           = (gw * cp) + 'px'
  grid.style.height          = (gh * cp) + 'px'
  grid.style.backgroundSize  = cp + 'px ' + cp + 'px'
  grid.style.cursor          = getCreateMode() ? 'crosshair' : 'default'

  for (const bin of (drawer.bins || [])) grid.appendChild(buildBinEl(bin, drawer, cp))

  // Drag-to-create (draw mode) or box-select (normal mode) on empty grid background
  setupCreateDrag(grid, drawer, cp)
  setupBoxSelect(grid, drawer, cp)

  // Track mouse position in grid cells for paste targeting
  grid.addEventListener('mousemove', (e) => {
    const rect = grid.getBoundingClientRect()
    setMouseGridCell({
      x: clamp(Math.floor((e.clientX - rect.left) / cp), 0, gw - 1),
      y: clamp(Math.floor((e.clientY - rect.top)  / cp), 0, gh - 1),
    })
  })
  grid.addEventListener('mouseleave', () => { setMouseGridCell(null) })

  // Click bare grid → deselect
  grid.addEventListener('click', (e) => {
    if (e.target === grid && getSelBinIds().size > 0) {
      getSelBinIds().clear()
      rerender()
    }
  })

  const wrap = mk('div', 'dm-grid-wrap')
  wrap.appendChild(grid)
  panel.appendChild(wrap)
}

// ── Bin element ───────────────────────────────────────────────────────────────

function buildBinEl(bin, drawer, cp) {
  const e = mk('div', 'dm-bin' + (getSelBinIds().has(bin.id) ? ' dm-bin--sel' : ''))

  e.style.left   = (bin.x * cp + INSET) + 'px'
  e.style.top    = (bin.y * cp + INSET) + 'px'
  e.style.width  = (bin.w * cp - INSET * 2) + 'px'
  e.style.height = (bin.h * cp - INSET * 2) + 'px'

  // Tint the drawer color to 40% opacity for a readable pastel bin background
  const hex = (drawer.color || '#94a3b8').replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  e.style.backgroundColor = `rgba(${r},${g},${b},0.4)`

  const lbl = mk('div', 'dm-bin-lbl')
  lbl.textContent = bin.part?.description || bin.id
  e.appendChild(lbl)

  setupBinInteraction(e, bin, drawer, cp)
  return e
}

// ── Bin mouse interaction (select + drag-to-move) ─────────────────────────────

function setupBinInteraction(binEl, bin, drawer, cp) {
  binEl.addEventListener('mousedown', (e) => {
    e.stopPropagation()

    const wasInSelection = getSelBinIds().has(bin.id)
    const isMultiSel     = getSelBinIds().size > 1
    const isModifier     = e.shiftKey || e.ctrlKey || e.metaKey

    // Modifier+click: toggle bin in/out of the current selection without starting a drag.
    if (isModifier) {
      if (wasInSelection) getSelBinIds().delete(bin.id)
      else getSelBinIds().add(bin.id)
      rerender()
      return
    }

    // If clicking a bin not in the current selection, start a new single-bin selection.
    // If it's already in a multi-selection, keep the group so the drag can move them all.
    if (!wasInSelection) setSelBinIds(new Set([bin.id]))

    const grid   = binEl.parentElement
    const startX = e.clientX
    const startY = e.clientY
    const gw = drawer.gridW || 13
    const gh = drawer.gridH || 13
    let moved = false
    let ghosts = []

    // Snapshot of all selected bins at drag start (positions may change mid-drag in state)
    const selBins = (drawer.bins || []).filter(b => getSelBinIds().has(b.id))

    function calcDelta(cx, cy) {
      const rawDx = Math.round((cx - startX) / cp)
      const rawDy = Math.round((cy - startY) / cp)
      return clampGroupDelta(selBins, rawDx, rawDy, gw, gh)
    }

    function onMove(e) {
      const adx = Math.abs(e.clientX - startX)
      const ady = Math.abs(e.clientY - startY)

      if (!moved && adx + ady > 5) {
        moved = true
        for (const sb of selBins) {
          const g = mk('div', 'dm-ghost')
          g.style.width  = (sb.w * cp - INSET * 2) + 'px'
          g.style.height = (sb.h * cp - INSET * 2) + 'px'
          g.dataset.ghostId = sb.id
          if (grid) grid.appendChild(g)
          ghosts.push(g)
        }
        if (!wasInSelection) rerender()   // paint new selection highlight immediately
      }

      if (!moved || ghosts.length === 0) return

      const { dx, dy } = calcDelta(e.clientX, e.clientY)
      const bad = hasMultiCollision(drawer.bins, getSelBinIds(), dx, dy)
      for (const g of ghosts) {
        const sb = selBins.find(b => b.id === g.dataset.ghostId)
        if (!sb) continue
        g.style.left = ((sb.x + dx) * cp + INSET) + 'px'
        g.style.top  = ((sb.y + dy) * cp + INSET) + 'px'
        g.classList.toggle('dm-ghost--bad', bad)
      }
    }

    function onUp(e) {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      for (const g of ghosts) if (grid?.contains(g)) grid.removeChild(g)
      ghosts = []

      if (moved) {
        const { dx, dy } = calcDelta(e.clientX, e.clientY)
        const blocked = hasMultiCollision(drawer.bins, getSelBinIds(), dx, dy)
        if (!blocked && (dx !== 0 || dy !== 0)) {
          pushHistory(drawer.id, drawer.bins)
          updateState(s => {
            const dr = findDrawer(s, drawer.id)
            if (!dr) return
            for (const sb of selBins) {
              const b = dr.bins.find(b => b.id === sb.id)
              if (b) { b.x = sb.x + dx; b.y = sb.y + dy }
            }
          })
          return // updateState triggers full rerender
        }
      }

      // Click without drag on a bin that was already in a multi-selection: narrow to single.
      if (!moved && wasInSelection && isMultiSel) {
        setSelBinIds(new Set([bin.id]))
        rerender()
        return
      }

      if (!wasInSelection) rerender()
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  })
}

// ── Drag-to-create on empty grid cells ────────────────────────────────────────

function setupCreateDrag(grid, drawer, cp) {
  grid.addEventListener('mousedown', (e) => {
    if (!getCreateMode()) return          // only create when draw mode is on
    if (e.target !== grid) return     // only fires on the bare grid background

    const rect = grid.getBoundingClientRect()
    const gw = drawer.gridW || 13
    const gh = drawer.gridH || 13

    const sx = Math.floor((e.clientX - rect.left) / cp)
    const sy = Math.floor((e.clientY - rect.top)  / cp)
    if (sx < 0 || sx >= gw || sy < 0 || sy >= gh) return

    let ex = sx, ey = sy

    const preview = mk('div', 'dm-preview')
    setAbsRect(preview, sx, sy, 1, 1, cp)
    grid.appendChild(preview)

    function onMove(e) {
      ex = clamp(Math.floor((e.clientX - rect.left) / cp), 0, gw - 1)
      ey = clamp(Math.floor((e.clientY - rect.top)  / cp), 0, gh - 1)
      const x = Math.min(sx, ex), y = Math.min(sy, ey)
      const w = Math.abs(ex - sx) + 1, h = Math.abs(ey - sy) + 1
      setAbsRect(preview, x, y, w, h, cp)
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      if (grid.contains(preview)) grid.removeChild(preview)

      const x = Math.min(sx, ex), y = Math.min(sy, ey)
      const w = Math.abs(ex - sx) + 1, h = Math.abs(ey - sy) + 1

      if (!hasCollision(drawer.bins, null, x, y, w, h)) {
        // heightUnits: null → inherits drawer.defaultHeightUnits at render time
        const newBin = { id: uid(), x, y, w, h, heightUnits: null, part: null }
        setSelBinIds(new Set([newBin.id]))
        pushHistory(drawer.id, drawer.bins)
        updateState(s => {
          findDrawer(s, drawer.id)?.bins.push(newBin)
        })
      } else if (getSelBinIds().size > 0) {
        getSelBinIds().clear()
        rerender()
      }
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  })
}

// ── Box (rubber-band) selection on empty grid cells (normal mode only) ───────

function setupBoxSelect(grid, drawer, cp) {
  grid.addEventListener('mousedown', (e) => {
    if (getCreateMode()) return            // draw mode owns the grid drag
    if (e.target !== grid) return      // only fires on bare grid background

    const rect = grid.getBoundingClientRect()
    const gw = drawer.gridW || 13
    const gh = drawer.gridH || 13

    const sx = clamp(Math.floor((e.clientX - rect.left) / cp), 0, gw - 1)
    const sy = clamp(Math.floor((e.clientY - rect.top)  / cp), 0, gh - 1)
    let ex = sx, ey = sy

    const box = mk('div', 'dm-sel-box')
    updateSelBox(box, sx, sy, sx, sy, cp)
    grid.appendChild(box)

    function onMove(ev) {
      ex = clamp(Math.floor((ev.clientX - rect.left) / cp), 0, gw - 1)
      ey = clamp(Math.floor((ev.clientY - rect.top)  / cp), 0, gh - 1)
      updateSelBox(box, sx, sy, ex, ey, cp)
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      if (grid.contains(box)) grid.removeChild(box)

      const rx = Math.min(sx, ex), ry = Math.min(sy, ey)
      const rw = Math.abs(ex - sx) + 1, rh = Math.abs(ey - sy) + 1

      const hit = (drawer.bins || []).filter(b =>
        overlaps(rx, ry, rw, rh, b.x, b.y, b.w, b.h)
      ).map(b => b.id)

      if (hit.length > 0) {
        setSelBinIds(new Set(hit))
        rerender()
      } else if (getSelBinIds().size > 0) {
        getSelBinIds().clear()
        rerender()
      }
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  })
}


// ═══════════════════════════════════════════════════════════════════════════════
// RIGHT PANEL — Bin Properties
// ═══════════════════════════════════════════════════════════════════════════════

export function buildProperties(panel, state) {
  const heading = mk('div', 'dm-heading')
  heading.textContent = 'Bin Properties'
  panel.appendChild(heading)

  const drawer = findDrawer(state, getSelDrawerId())

  // ── Multi-select panel ───────────────────────────────────────────────────
  if (getSelBinIds().size > 1) {
    const info = mk('div', 'dm-multisel-info')
    info.textContent = `${getSelBinIds().size} bins selected`
    panel.appendChild(info)

    const hint = mk('div', 'dm-empty')
    hint.textContent = 'Use arrow keys or drag any selected bin to move the group.'
    panel.appendChild(hint)

    const actions = mk('div', 'dm-actions')
    const delBtn = mk('button', 'btn dm-btn-danger')
    delBtn.textContent = `Delete ${getSelBinIds().size} Bins`
    delBtn.addEventListener('click', () => {
      const ids = new Set(getSelBinIds())
      getSelBinIds().clear()
      pushHistory(getSelDrawerId(), drawer.bins)
      updateState(s => {
        const dr = findDrawer(s, getSelDrawerId())
        if (dr) dr.bins = dr.bins.filter(b => !ids.has(b.id))
      })
    })
    actions.appendChild(delBtn)
    panel.appendChild(actions)
    return
  }

  const bin = drawer?.bins.find(b => b.id === selBinId()) ?? null

  if (!bin) {
    const empty = mk('div', 'dm-empty')
    empty.textContent = 'Select a bin to view its properties.'
    panel.appendChild(empty)
    return
  }

  // Effective height: explicit bin value, or drawer default, or fallback 6
  const effectiveH    = bin.heightUnits ?? (drawer?.defaultHeightUnits ?? 6)
  const heightDisplay = bin.heightUnits != null
    ? String(bin.heightUnits)
    : `${effectiveH} (drawer default)`

  const rows = [
    ['ID',           bin.id],
    ['Position',     `x\u2009${bin.x}, y\u2009${bin.y}`],
    ['Size',         `${bin.w}\u202F\xD7\u202F${bin.h} cells`],
    ['Height units', heightDisplay],
  ]

  const list = mk('div', 'dm-props')
  for (const [k, v] of rows) {
    const row = mk('div', 'dm-prop')
    row.innerHTML =
      `<span class="dm-prop-k">${esc(k)}</span>` +
      `<span class="dm-prop-v">${esc(String(v))}</span>`
    list.appendChild(row)
  }
  panel.appendChild(list)

  // Fastener silhouette — shown when a part is assigned
  if (bin.part?.headType) {
    const iconWrap = mk('div', 'dm-part-icon-wrap')
    iconWrap.appendChild(makeFastenerSVGEl(bin.part))
    panel.appendChild(iconWrap)
  }

  // Part assigner
  const assignerWrap = mk('div', 'dm-part-assigner')
  renderPartAssigner(assignerWrap, bin, drawer)
  panel.appendChild(assignerWrap)

  // Label overrides
  const overridesWrap = mk('div', 'dm-overrides')
  buildLabelOverrides(overridesWrap, bin, drawer)
  panel.appendChild(overridesWrap)

  // Action buttons
  const actions = mk('div', 'dm-actions')

  const dupBtn = document.createElement('button')
  dupBtn.className = 'btn btn-primary'
  dupBtn.textContent = 'Duplicate Bin \u2192'
  dupBtn.addEventListener('click', () => duplicateBin(bin, drawer, panel))
  actions.appendChild(dupBtn)

  const delBtn = document.createElement('button')
  delBtn.className = 'btn dm-btn-danger'
  delBtn.textContent = 'Delete Bin'
  delBtn.addEventListener('click', () => {
    getSelBinIds().clear()
    pushHistory(drawer.id, drawer.bins)
    updateState(s => {
      const dr = findDrawer(s, drawer.id)
      if (dr) dr.bins = dr.bins.filter(b => b.id !== bin.id)
    })
  })
  actions.appendChild(delBtn)

  panel.appendChild(actions)

  const status = mk('div', 'dm-status')
  status.id = 'dm-dup-status'
  panel.appendChild(status)
}

// ── Label Overrides ───────────────────────────────────────────────────────────

function buildLabelOverrides(container, bin, drawer) {
  const h = mk('div', 'dm-assigner-heading')
  h.textContent = 'Label Overrides'
  container.appendChild(h)

  const overrides = bin.overrides || {}
  const part = bin.part || {}

  function makeTextRow(label, key, placeholder) {
    const row = mk('div', 'dm-assigner-row')
    const lbl = mk('label', 'dm-assigner-lbl')
    lbl.textContent = label
    const input = mk('input', 'dm-override-input')
    input.type = 'text'
    input.value = overrides[key] ?? ''
    input.placeholder = placeholder || ''
    input.addEventListener('change', () => {
      pushHistory(drawer.id, drawer.bins)
      updateState(s => {
        const b = findDrawer(s, drawer.id)?.bins.find(b => b.id === bin.id)
        if (!b) return
        if (!b.overrides) b.overrides = {}
        const val = input.value.trim()
        if (val) {
          b.overrides[key] = val
        } else {
          delete b.overrides[key]
          if (Object.keys(b.overrides).length === 0) delete b.overrides
        }
      })
    })
    row.append(lbl, input)
    container.appendChild(row)
  }

  makeTextRow('Description', 'description', part.description || bin.id)
  makeTextRow('Standard', 'standard', part.standard || '')
  makeTextRow(`${skuLabel(part)} (barcode)`, 'bn', partSku(part))

  // Disable image checkbox
  const cbRow = mk('div', 'dm-override-cb-row')
  const cb = mk('input')
  cb.type = 'checkbox'
  cb.className = 'dm-override-cb'
  cb.id = `dm-override-noimg-${bin.id}`
  cb.checked = !!overrides.disableImage
  cb.addEventListener('change', () => {
    pushHistory(drawer.id, drawer.bins)
    updateState(s => {
      const b = findDrawer(s, drawer.id)?.bins.find(b => b.id === bin.id)
      if (!b) return
      if (!b.overrides) b.overrides = {}
      if (cb.checked) {
        b.overrides.disableImage = true
      } else {
        delete b.overrides.disableImage
        if (Object.keys(b.overrides).length === 0) delete b.overrides
      }
    })
  })
  const cbLbl = mk('label', 'dm-override-cb-lbl')
  cbLbl.htmlFor = cb.id
  cbLbl.textContent = 'Disable image on label'
  cbRow.append(cb, cbLbl)
  container.appendChild(cbRow)

  // Reduce image length checkbox
  const cbRow2 = mk('div', 'dm-override-cb-row')
  const cb2 = mk('input')
  cb2.type = 'checkbox'
  cb2.className = 'dm-override-cb'
  cb2.id = `dm-override-reducelen-${bin.id}`
  cb2.checked = !!overrides.reduceImageLength
  cb2.addEventListener('change', () => {
    pushHistory(drawer.id, drawer.bins)
    updateState(s => {
      const b = findDrawer(s, drawer.id)?.bins.find(b => b.id === bin.id)
      if (!b) return
      if (!b.overrides) b.overrides = {}
      if (cb2.checked) {
        b.overrides.reduceImageLength = true
      } else {
        delete b.overrides.reduceImageLength
        if (Object.keys(b.overrides).length === 0) delete b.overrides
      }
    })
  })
  const cb2Lbl = mk('label', 'dm-override-cb-lbl')
  cb2Lbl.htmlFor = cb2.id
  cb2Lbl.textContent = 'Reduce image length (break mark)'
  cbRow2.append(cb2, cb2Lbl)
  container.appendChild(cbRow2)

  // Ignore icon checkbox
  const cbRow3 = mk('div', 'dm-override-cb-row')
  const cb3 = mk('input')
  cb3.type = 'checkbox'
  cb3.className = 'dm-override-cb'
  cb3.id = `dm-override-ignoreicon-${bin.id}`
  cb3.checked = !!overrides.ignoreIcon
  cb3.addEventListener('change', () => {
    pushHistory(drawer.id, drawer.bins)
    updateState(s => {
      const b = findDrawer(s, drawer.id)?.bins.find(b => b.id === bin.id)
      if (!b) return
      if (!b.overrides) b.overrides = {}
      if (cb3.checked) {
        b.overrides.ignoreIcon = true
      } else {
        delete b.overrides.ignoreIcon
        if (Object.keys(b.overrides).length === 0) delete b.overrides
      }
    })
  })
  const cb3Lbl = mk('label', 'dm-override-cb-lbl')
  cb3Lbl.htmlFor = cb3.id
  cb3Lbl.textContent = 'Ignore icon (text may overlap)'
  cbRow3.append(cb3, cb3Lbl)
  container.appendChild(cbRow3)

  // Desc. font size input
  const fsRow = mk('div', 'dm-override-cb-row')
  const fsLbl = mk('label', 'dm-override-cb-lbl')
  fsLbl.htmlFor = `dm-override-fontsize-${bin.id}`
  fsLbl.textContent = 'Desc. font size:'
  const fsInput = mk('input')
  fsInput.type = 'number'
  fsInput.min = '6'
  fsInput.max = '24'
  fsInput.id = `dm-override-fontsize-${bin.id}`
  fsInput.className = 'dm-override-fontsize-input'
  fsInput.placeholder = 'px'
  fsInput.value = overrides.descFontSize != null ? String(overrides.descFontSize) : ''
  fsInput.addEventListener('change', () => {
    pushHistory(drawer.id, drawer.bins)
    updateState(s => {
      const b = findDrawer(s, drawer.id)?.bins.find(b => b.id === bin.id)
      if (!b) return
      if (!b.overrides) b.overrides = {}
      const v = parseInt(fsInput.value, 10)
      if (!isNaN(v) && v >= 6 && v <= 24) {
        b.overrides.descFontSize = v
      } else {
        fsInput.value = ''
        delete b.overrides.descFontSize
        if (Object.keys(b.overrides).length === 0) delete b.overrides
      }
    })
  })
  const fsPx = mk('span', 'dm-override-cb-lbl')
  fsPx.textContent = 'px'
  fsRow.append(fsLbl, fsInput, fsPx)
  container.appendChild(fsRow)
}

// ── Part Assigner ─────────────────────────────────────────────────────────────

function renderPartAssigner(container, bin, drawer) {
  container.innerHTML = ''

  // Reset cascade state when a different bin is selected
  if (getPartSel()._binId !== bin.id) {
    // A preferred supplier answers the first question up front, so filling a
    // drawer from one vendor does not mean picking it for every bin.
    const preferred = getState().preferences?.supplier
    setPartSel({ _binId: bin.id, ...(preferred ? { supplier: preferred } : {}) })

    // Pre-populate from the existing assignment, so re-opening a bin lands on
    // what it already holds rather than an empty cascade.
    const id = partIdentity(bin.part)
    if (id) {
      const ex = findBySku(id.supplier, id.sku)
      if (ex) {
        const sel = getPartSel()
        sel.supplier = id.supplier
        sel.type     = typeForHeadType(ex.headType)
        sel.thread   = ex.thread
        sel.headType = ex.headType
        sel.length   = ex.length ?? null
        sel.drive    = ex.drive || null
        const v = variantForEntry(ex)
        if (v) sel.variant = v.value
      }
    }
  }

  const s = getPartSel()

  const h = mk('div', 'dm-assigner-heading')
  h.textContent = 'Part Assignment'
  container.appendChild(h)

  renderCurrentAssignment(container, bin, drawer)

  // ── Step 1: part type ──────────────────────────────────────────────────────
  const typeOptions = Object.entries(TYPE_DEFS)
    .filter(([, def]) => dbFilter({ headTypes: def.headTypes }).length > 0)
    .map(([value, def]) => ({ value, label: def.label }))

  container.appendChild(buildSelectRow('Type', typeOptions, s.type, val => {
    // Supplier is asked before Type, so it survives changing the type.
    setPartSel({ _binId: bin.id, type: val, ...(s.supplier ? { supplier: s.supplier } : {}) })
    renderPartAssigner(container, bin, drawer)
  }))

  if (!s.type) return

  // ── Steps 2..n: whatever this part type asks for ───────────────────────────
  const { steps, matches, complete } = buildCascade({ typeId: s.type, selection: s })

  for (const step of steps) {
    if (step.kind === 'info') {
      container.appendChild(buildInfoRow(step.label, step.text))
      continue
    }
    container.appendChild(buildSelectRow(step.label, step.options, step.value, val => {
      setPartSel(selectionAfter(getPartSel(), s.type, step.key, val))
      renderPartAssigner(container, bin, drawer)
    }))
  }

  if (!complete) return

  renderMatch(container, bin, drawer, matches, s)
}

/** A read-only row for a step the cascade resolved on its own. */
function buildInfoRow(label, text) {
  const row = mk('div', 'dm-assigner-row')
  const lbl = mk('span', 'dm-assigner-lbl')
  lbl.textContent = label
  const val = mk('span', 'dm-assigner-auto')
  val.textContent = text
  row.append(lbl, val)
  return row
}

/** Current assignment badge plus its clear button. */
function renderCurrentAssignment(container, bin, drawer) {
  if (!bin.part?.description) return

  const cur = mk('div', 'dm-assigner-current')
  const badge = mk('span', 'dm-assigner-badge')
  badge.textContent = bin.part.description

  const clrBtn = mk('button', 'btn dm-btn-clear')
  clrBtn.textContent = '\u00D7 Clear'
  clrBtn.addEventListener('click', () => {
    setPartSel({ _binId: bin.id })
    pushHistory(drawer.id, drawer.bins)
    updateState(st => {
      const b = findDrawer(st, drawer.id)?.bins.find(b => b.id === bin.id)
      if (b) b.part = null
    })
  })

  cur.append(badge, clrBtn)
  container.appendChild(cur)
}

/** Final disambiguation, preview and the assign button. */
function renderMatch(container, bin, drawer, matches, s) {
  if (matches.length === 0) {
    const noMatch = mk('div', 'dm-assigner-nomatch')
    noMatch.textContent = 'No matching parts found.'
    container.appendChild(noMatch)
    return
  }

  let match = matches[0]
  if (matches.length > 1) {
    if (!s.matchPN) getPartSel().matchPN = matches[0].articleNumber
    const currentPN = s.matchPN || matches[0].articleNumber

    container.appendChild(buildSelectRow(
      'Part',
      matches.map(m => ({ value: m.sku, label: `${buildPartDescription(m)} \u2014 ${m.sku}` })),
      currentPN,
      val => {
        setPartSel({ ...getPartSel(), matchPN: val })
        renderPartAssigner(container, bin, drawer)
      },
    ))
    match = matches.find(m => m.sku === currentPN) || matches[0]
    if (!s.matchPN) return
  }

  const preview = mk('div', 'dm-assigner-preview')
  preview.textContent = buildPartDescription(match)
  container.appendChild(preview)

  const previewPart = dbEntryToPart(match)
  if (previewPart.headType) {
    const iconWrap = mk('div', 'dm-assigner-icon-wrap')
    iconWrap.appendChild(makeFastenerSVGEl(previewPart))
    container.appendChild(iconWrap)
  }

  const assignBtn = mk('button', 'btn btn-primary dm-assign-btn')
  assignBtn.textContent = 'Assign Part'
  if (partSku(bin.part) === match.sku) {
    assignBtn.disabled = true
    assignBtn.textContent = 'Already Assigned'
  }
  assignBtn.addEventListener('click', () => {
    const part = dbEntryToPart(match)
    setPartSel({ _binId: bin.id })
    pushHistory(drawer.id, drawer.bins)
    updateState(st => {
      const b = findDrawer(st, drawer.id)?.bins.find(b => b.id === bin.id)
      if (!b) return
      b.part = part
      if (b.w === 1 && (part.length ?? 0) > 10) {
        if (!b.overrides) b.overrides = {}
        b.overrides.reduceImageLength = true
      }
    })
  })
  container.appendChild(assignBtn)
}
