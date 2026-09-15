/**
 * Cabinets / Config view.
 * - Add/edit/delete cabinets
 * - Add/edit/delete/reorder drawers within cabinets
 */

import { updateState } from '../state.js'
import { CABINET_TYPES, DEFAULT_CABINET_TYPE, getCabinetType } from '../data/cabinetTypes.js'
import { jumpToDrawer } from './DrawerMap.js'

const GF_UNIT = 42
const SAFETY = 5
const HEIGHT_UNIT = 7

function calcGridW(w)          { return Math.floor((w - SAFETY) / GF_UNIT) }
function calcGridH(d)          { return Math.floor((d - SAFETY) / GF_UNIT) }
function calcUsableH(fh, margin) { return fh - margin }
function calcMaxUnits(uh)      { return Math.floor(uh / HEIGHT_UNIT) }
function uid(prefix)           { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }

export function renderSetup(container, state) {
  const el = document.createElement('div')
  el.className = 'setup-view'

  // ── Cabinets ──────────────────────────────────────────────────────────────
  const cabinets = state.cabinets || []
  for (const cab of cabinets) {
    el.appendChild(renderCabinet(cab))
  }

  // ── Add Cabinet button ────────────────────────────────────────────────────
  const addCabBtn = document.createElement('button')
  addCabBtn.className = 'btn btn-primary'
  addCabBtn.id = 'add-cabinet-btn'
  addCabBtn.textContent = '+ Add Cabinet'
  el.appendChild(addCabBtn)

  container.appendChild(el)

  addCabBtn.addEventListener('click', () => showAddCabinetDialog())
}

// ── Cabinet card ──────────────────────────────────────────────────────────────

function heightCheckHTML(cab) {
  const sumH = (cab.drawers || []).reduce((s, d) => s + (d.frontHeight || 0), 0)
  const total = cab.totalFrontHeightMM
  const diff = sumH - total
  let cls, label
  if (diff === 0) {
    cls = 'height-check-ok'
    label = `✓ Drawers fill exactly ${sumH} mm`
  } else if (diff < 0) {
    cls = 'height-check-under'
    label = `▲ ${sumH} / ${total} mm — ${Math.abs(diff)} mm unaccounted`
  } else {
    cls = 'height-check-over'
    label = `✗ ${sumH} / ${total} mm — ${diff} mm over`
  }

  const pct = Math.min(100, total > 0 ? (sumH / total) * 100 : 0)
  return `
    <div class="height-check ${cls}">
      <div class="height-check-bar-wrap">
        <div class="height-check-bar" style="width:${pct}%"></div>
      </div>
      <span class="height-check-label">${label}</span>
    </div>
  `
}

function renderCabinet(cab) {
  const gw = calcGridW(cab.innerWidthMM)
  const gh = calcGridH(cab.innerDepthMM)
  const typeSpec = getCabinetType(cab.cabinetType)

  const card = document.createElement('div')
  card.className = 'cabinet-card section'
  card.dataset.cabId = cab.id

  card.innerHTML = `
    <div class="cabinet-header">
      <div class="cabinet-title">
        <span class="cabinet-name">${esc(cab.name)}</span>
        <button class="icon-btn" data-action="rename-cabinet" title="Rename cabinet">✎</button>
        <button class="icon-btn icon-btn-danger" data-action="delete-cabinet" title="Delete cabinet" style="margin-left:auto">🗑</button>
      </div>
      <div class="cabinet-meta">
        ${esc(typeSpec.brand)} — ${esc(typeSpec.description)} &nbsp;·&nbsp;
        ${cab.innerWidthMM} × ${cab.innerDepthMM} mm inner &nbsp;·&nbsp;
        Front: ${cab.totalFrontHeightMM} mm &nbsp;·&nbsp;
        <strong>Gridfinity: ${gw} × ${gh} units</strong>
      </div>
      ${heightCheckHTML(cab)}
    </div>
    <div class="drawers-list" data-cab-id="${cab.id}"></div>
    <button class="btn add-drawer-btn" data-cab-id="${cab.id}">+ Add Drawer</button>
  `

  const drawersList = card.querySelector('.drawers-list')
  const sorted = [...(cab.drawers || [])].sort((a, b) => a.order - b.order)
  for (const d of sorted) {
    drawersList.appendChild(renderDrawerRow(d, cab))
  }

  // Delete cabinet
  card.querySelector('[data-action="delete-cabinet"]').addEventListener('click', () => {
    if (!confirm(`Delete cabinet "${cab.name}" and all its drawers? This cannot be undone.`)) return
    updateState(s => {
      s.cabinets = s.cabinets.filter(c => c.id !== cab.id)
    })
  })

  // Rename cabinet inline
  card.querySelector('[data-action="rename-cabinet"]').addEventListener('click', () => {
    const nameEl = card.querySelector('.cabinet-name')
    const current = nameEl.textContent
    const input = document.createElement('input')
    input.type = 'text'
    input.value = current
    input.className = 'inline-edit'
    nameEl.replaceWith(input)
    input.focus()
    input.select()
    const commit = () => {
      const val = input.value.trim() || current
      updateState(s => {
        const c = s.cabinets.find(c => c.id === cab.id)
        if (c) c.name = val
      })
    }
    input.addEventListener('blur', commit)
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur() })
  })

  // Add drawer
  card.querySelector('.add-drawer-btn').addEventListener('click', () => addDrawer(cab.id))

  // Drag-and-drop for reordering drawers
  setupDragDrop(drawersList, cab.id)

  return card
}

// ── Drawer row ────────────────────────────────────────────────────────────────

function renderDrawerRow(drawer, cab) {
  const cabId = cab.id
  const typeSpec = getCabinetType(cab.cabinetType)
  // Use stored values — they were calculated with this cabinet's type margin
  const uh = drawer.usableInnerHeight
  const mu = drawer.maxHeightUnits
  const { filled, total } = drawerFillStats(drawer)
  const fillPct = total > 0 ? Math.round((filled / total) * 100) : 0

  const row = document.createElement('div')
  row.className = 'drawer-row'
  row.draggable = true
  row.dataset.drawerId = drawer.id
  row.dataset.cabId = cabId

  row.innerHTML = `
    <span class="drag-handle" title="Drag to reorder">⠿</span>
    <span class="drawer-color-swatch" style="background:${drawer.color}"></span>
    <span class="drawer-label">${esc(drawer.label)}</span>
    <button class="icon-btn" data-action="rename-drawer" title="Rename drawer">✎</button>
    <select class="drawer-height-select" data-action="set-height" title="Front height (mm)">
      ${typeSpec.drawerFrontHeights.map(h => `<option value="${h}"${h === drawer.frontHeight ? ' selected' : ''}>${h} mm</option>`).join('')}
    </select>
    <span class="drawer-dims-info">${uh} mm inner &nbsp;· max ${mu}u</span>
    <span class="drawer-fill-info">${filled}/${total} (${fillPct}%)</span>
    <input type="color" class="drawer-color-input" value="${drawer.color}" title="Pick drawer color" />
    <button class="icon-btn" data-action="goto-map" title="Go to drawer map">↗</button>
    <button class="icon-btn icon-btn-danger" data-action="delete-drawer" title="Delete drawer">🗑</button>
  `

  // Rename drawer inline
  row.querySelector('[data-action="rename-drawer"]').addEventListener('click', () => {
    const labelEl = row.querySelector('.drawer-label')
    const current = labelEl.textContent
    const input = document.createElement('input')
    input.type = 'text'
    input.value = current
    input.className = 'inline-edit'
    labelEl.replaceWith(input)
    input.focus()
    input.select()
    const commit = () => {
      const val = input.value.trim() || current
      updateState(s => {
        const c = s.cabinets.find(c => c.id === cabId)
        if (!c) return
        const d = c.drawers.find(d => d.id === drawer.id)
        if (d) d.label = val
      })
    }
    input.addEventListener('blur', commit)
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur() })
  })

  // Front height — look up the cabinet type from live state to get the correct margin
  row.querySelector('[data-action="set-height"]').addEventListener('change', (e) => {
    const fh = parseInt(e.target.value)
    updateState(s => {
      const c = s.cabinets.find(c => c.id === cabId)
      if (!c) return
      const d = c.drawers.find(d => d.id === drawer.id)
      if (!d) return
      const spec = getCabinetType(c.cabinetType)
      d.frontHeight = fh
      d.usableInnerHeight = calcUsableH(fh, spec.heightMarginMM)
      d.maxHeightUnits = calcMaxUnits(d.usableInnerHeight)
    })
  })

  // Color picker — live swatch update, commit on change
  const colorInput = row.querySelector('.drawer-color-input')
  colorInput.addEventListener('input', (e) => {
    row.querySelector('.drawer-color-swatch').style.background = e.target.value
  })
  colorInput.addEventListener('change', (e) => {
    const color = e.target.value
    updateState(s => {
      const cab = s.cabinets.find(c => c.id === cabId)
      if (!cab) return
      const d = cab.drawers.find(d => d.id === drawer.id)
      if (d) d.color = color
    })
  })

  // Go to drawer map
  row.querySelector('[data-action="goto-map"]').addEventListener('click', () => {
    jumpToDrawer(drawer.id)
    document.dispatchEvent(new CustomEvent('navigate', { detail: 'drawers' }))
  })

  // Delete
  row.querySelector('[data-action="delete-drawer"]').addEventListener('click', () => {
    if (!confirm(`Delete drawer "${drawer.label}"? This cannot be undone.`)) return
    updateState(s => {
      const cab = s.cabinets.find(c => c.id === cabId)
      if (!cab) return
      cab.drawers = cab.drawers.filter(d => d.id !== drawer.id)
      cab.drawers.sort((a, b) => a.order - b.order).forEach((d, i) => { d.order = i })
    })
  })

  return row
}

// ── Drag-and-drop reorder (within cabinet only) ───────────────────────────────

function setupDragDrop(drawersList, cabId) {
  let draggedId = null

  drawersList.addEventListener('dragstart', (e) => {
    const row = e.target.closest('.drawer-row')
    if (!row) return
    draggedId = row.dataset.drawerId
    row.classList.add('dragging')
    e.dataTransfer.effectAllowed = 'move'
  })

  drawersList.addEventListener('dragend', () => {
    drawersList.querySelectorAll('.dragging, .drag-over').forEach(el => {
      el.classList.remove('dragging', 'drag-over')
    })
    draggedId = null
  })

  drawersList.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const row = e.target.closest('.drawer-row')
    if (row && row.dataset.drawerId !== draggedId) {
      drawersList.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'))
      row.classList.add('drag-over')
    }
  })

  drawersList.addEventListener('drop', (e) => {
    e.preventDefault()
    const targetRow = e.target.closest('.drawer-row')
    if (!targetRow || !draggedId) return
    const targetId = targetRow.dataset.drawerId
    if (targetId === draggedId) return

    updateState(s => {
      const cab = s.cabinets.find(c => c.id === cabId)
      if (!cab) return
      const drawers = [...cab.drawers].sort((a, b) => a.order - b.order)
      const fromIdx = drawers.findIndex(d => d.id === draggedId)
      const toIdx   = drawers.findIndex(d => d.id === targetId)
      if (fromIdx === -1 || toIdx === -1) return
      const [moved] = drawers.splice(fromIdx, 1)
      drawers.splice(toIdx, 0, moved)
      drawers.forEach((d, i) => { d.order = i })
      cab.drawers = drawers
    })
  })
}

// ── Add drawer ────────────────────────────────────────────────────────────────

function addDrawer(cabId) {
  updateState(s => {
    const cab = s.cabinets.find(c => c.id === cabId)
    if (!cab) return
    const order = (cab.drawers || []).length
    const spec = getCabinetType(cab.cabinetType)
    const fh = spec.defaultDrawerFrontHeight
    const uh = calcUsableH(fh, spec.heightMarginMM)
    cab.drawers.push({
      id: uid('drawer'),
      order,
      label: `Drawer ${order + 1}`,
      frontHeight: fh,
      usableInnerHeight: uh,
      maxHeightUnits: calcMaxUnits(uh),
      color: '#94a3b8',
      gridW: cab.gridW,
      gridH: cab.gridH,
      bins: [],
    })
  })
}

// ── Add cabinet dialog ────────────────────────────────────────────────────────

function showAddCabinetDialog() {
  const defaultType = getCabinetType(DEFAULT_CABINET_TYPE)
  const typeOptions = Object.values(CABINET_TYPES)
    .map(t => `<option value="${t.id}">${esc(t.brand)} — ${esc(t.description)}</option>`)
    .join('')

  const overlay = document.createElement('div')
  overlay.className = 'dialog-overlay'
  overlay.innerHTML = `
    <div class="dialog">
      <h3>Add Cabinet</h3>
      <div class="dialog-fields">
        <label>
          Cabinet type
          <select id="dlg-type">${typeOptions}</select>
        </label>
        <label>
          Name
          <input type="text" id="dlg-name" value="New Cabinet" />
        </label>
        <label>
          Inner usable width (mm)
          <input type="number" id="dlg-width" value="${defaultType.defaultInnerWidthMM}" min="1" step="1" />
        </label>
        <label>
          Inner usable depth (mm)
          <input type="number" id="dlg-depth" value="${defaultType.defaultInnerDepthMM}" min="1" step="1" />
        </label>
        <label>
          Total front panel height (mm)
          <input type="number" id="dlg-total-h" value="1200" min="1" step="1" />
        </label>
        <div class="dialog-preview" id="dlg-preview"></div>
      </div>
      <div class="dialog-actions">
        <button class="btn" id="dlg-cancel">Cancel</button>
        <button class="btn btn-primary" id="dlg-confirm">Add Cabinet</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  const updatePreview = () => {
    const w = parseInt(overlay.querySelector('#dlg-width').value) || 0
    const d = parseInt(overlay.querySelector('#dlg-depth').value) || 0
    const gw = calcGridW(w)
    const gh = calcGridH(d)
    overlay.querySelector('#dlg-preview').textContent = `Gridfinity: ${gw} × ${gh} units`
  }
  updatePreview()
  overlay.querySelector('#dlg-width').addEventListener('input', updatePreview)
  overlay.querySelector('#dlg-depth').addEventListener('input', updatePreview)

  // When the type changes, auto-fill the default dimensions for that type
  overlay.querySelector('#dlg-type').addEventListener('change', (e) => {
    const spec = getCabinetType(e.target.value)
    overlay.querySelector('#dlg-width').value = spec.defaultInnerWidthMM
    overlay.querySelector('#dlg-depth').value = spec.defaultInnerDepthMM
    updatePreview()
  })

  overlay.querySelector('#dlg-cancel').addEventListener('click', () => overlay.remove())
  overlay.querySelector('#dlg-confirm').addEventListener('click', () => {
    const cabinetType = overlay.querySelector('#dlg-type').value
    const name  = overlay.querySelector('#dlg-name').value.trim() || 'New Cabinet'
    const w     = parseInt(overlay.querySelector('#dlg-width').value)
    const d     = parseInt(overlay.querySelector('#dlg-depth').value)
    const totalH = parseInt(overlay.querySelector('#dlg-total-h').value)
    if (!w || !d || !totalH) { alert('Please fill in all dimensions.'); return }
    updateState(s => {
      s.cabinets.push({
        id: uid('cabinet'),
        name,
        cabinetType,
        innerWidthMM: w,
        innerDepthMM: d,
        totalFrontHeightMM: totalH,
        gridW: calcGridW(w),
        gridH: calcGridH(d),
        labelSheet: { columns: 3, rows: 7, widthMM: 63.5, heightMM: 38.1, preset: 'Avery L7160' },
        drawers: [],
      })
    })
    overlay.remove()
  })

  // Close on backdrop click
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })
}



// ── Helpers ───────────────────────────────────────────────────────────────────

function drawerFillStats(drawer) {
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

function esc(str) {
  const d = document.createElement('div')
  d.textContent = str ?? ''
  return d.innerHTML
}
