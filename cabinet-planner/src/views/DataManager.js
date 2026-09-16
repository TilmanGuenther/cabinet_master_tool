/**
 * Data Manager view.
 * - Import / Export cabinet config JSON
 * - Named snapshot saves
 * (Extracted from Setup.js)
 */

import { CATALOGS } from '../data/catalogs/index.js'
import {
  setState, updateState,
  isStorageAvailable, getAutoSaveTimestamp,
  getSaves, createSave, loadSave, deleteSave, clearAutoSave,
} from '../state.js'

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function esc(str) {
  const d = document.createElement('div')
  d.textContent = str ?? ''
  return d.innerHTML
}

export function renderDataManager(container, state) {
  const el = document.createElement('div')
  el.className = 'data-manager-view'

  // ── Import / Export ───────────────────────────────────────────────────────
  const ioSection = document.createElement('div')
  ioSection.className = 'section no-print'
  ioSection.innerHTML = `
    <h2 class="section-heading">Import &amp; Export</h2>
    <p class="dm-description">
      Load a cabinet configuration from a JSON file, or export your current layout for backup and sharing.
      This is the only reliable way to persist your data long-term &mdash; browser storage can be cleared at any time.
    </p>
    <div class="dm-io-toolbar">
      <label class="btn" title="Import cabinets from a JSON file">
        &#128194; Import JSON
        <input type="file" accept=".json" id="dm-import-input" style="display:none" />
      </label>
      <button class="btn btn-primary" id="dm-export-btn">&#128229; Export JSON</button>
    </div>
  `
  el.appendChild(ioSection)

  ioSection.querySelector('#dm-import-input').addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      if (!json.cabinets) throw new Error('Missing "cabinets" key in JSON')
      const existing = (state.cabinets || []).length
      if (existing > 0) {
        showImportDialog(json, existing)
      } else {
        setState(json)
      }
    } catch (err) {
      alert('Import failed: ' + err.message)
    }
  })

  ioSection.querySelector('#dm-export-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const firstName = ((state.cabinets || [])[0]?.name || 'cabinets').replace(/\s+/g, '_')
    a.download = `${firstName}.json`
    a.click()
    URL.revokeObjectURL(url)
  })

  // ── Saves ─────────────────────────────────────────────────────────────────
  el.appendChild(renderSupplierPanel(state))
  el.appendChild(renderSavesPanel())

  container.appendChild(el)
}

// ── Saves panel ───────────────────────────────────────────────────────────────

/**
 * Preferred supplier.
 *
 * Only meaningful once more than one catalog is registered, so with a single
 * catalog the section is left out entirely rather than shown as a dropdown with
 * one choice.
 */
function renderSupplierPanel(state) {
  const ids = Object.keys(CATALOGS)
  if (ids.length < 2) return document.createDocumentFragment()

  const section = document.createElement('div')
  section.className = 'section no-print'

  const current = state.preferences?.supplier || ''
  const options = ids.map(id =>
    `<option value="${esc(id)}"${id === current ? ' selected' : ''}>${esc(CATALOGS[id].brand)}</option>`,
  ).join('')

  section.innerHTML = `
    <h2 class="section-heading">Preferred Supplier</h2>
    <p class="dm-description">
      Answers the supplier question up front when assigning parts, so filling a drawer
      from one vendor does not mean picking it for every bin. You can still choose a
      different supplier for any individual bin.
    </p>
    <select id="dm-preferred-supplier">
      <option value="">&mdash; no preference &mdash;</option>
      ${options}
    </select>
  `

  section.querySelector('#dm-preferred-supplier').addEventListener('change', e => {
    const value = e.target.value
    updateState(st => {
      if (!st.preferences) st.preferences = {}
      if (value) st.preferences.supplier = value
      else delete st.preferences.supplier
    })
  })

  return section
}

function renderSavesPanel() {
  const panel = document.createElement('div')
  panel.className = 'section saves-panel no-print'

  const storageOk = isStorageAvailable()

  function refresh() {
    panel.innerHTML = ''

    const heading = document.createElement('h2')
    heading.className = 'section-heading saves-heading'
    heading.textContent = 'Local Saves'
    panel.appendChild(heading)

    if (!storageOk) {
      const unavail = document.createElement('div')
      unavail.className = 'saves-storage-unavailable'
      unavail.innerHTML = `
        <strong>Local storage is unavailable.</strong>
        Auto-save and named saves are disabled in this browser or context
        (e.g. private browsing with strict settings).
        Use <em>Export JSON</em> to save your work to a file.
      `
      panel.appendChild(unavail)
      return
    }

    // Persistence warning
    const warning = document.createElement('div')
    warning.className = 'saves-persistence-warning'
    warning.innerHTML = `
      <strong>Note:</strong> Browser local storage is not permanent &mdash; it can be cleared
      by the browser, OS disk pressure, clearing site data, or switching profiles.
      Use <em>Export JSON</em> for reliable long-term backups.
    `
    panel.appendChild(warning)

    // Auto-save row
    const ts = getAutoSaveTimestamp()
    const autoRow = document.createElement('div')
    autoRow.className = 'saves-autosave-row'
    autoRow.innerHTML = `
      <div class="saves-autosave-info">
        <span class="saves-autosave-label">Auto-save</span>
        <span class="saves-autosave-ts">${ts ? 'Last saved ' + formatRelativeTime(ts) : 'Not yet saved'}</span>
      </div>
      <button class="btn btn-danger saves-clear-btn" id="saves-clear-btn">Clear &amp; Reset to Sample</button>
    `
    autoRow.querySelector('#saves-clear-btn').addEventListener('click', () => {
      if (!confirm('Clear the auto-save and all named saves, then reset to the sample config? This cannot be undone.')) return
      clearAutoSave()
      try { localStorage.removeItem('cabinet_planner_saves') } catch {}
      window.location.reload()
    })
    panel.appendChild(autoRow)

    // Named saves header
    const listHeader = document.createElement('div')
    listHeader.className = 'saves-list-header'
    listHeader.innerHTML = `
      <span class="saves-list-title">Named Snapshots</span>
      <button class="btn btn-primary" id="saves-create-btn">+ Save Snapshot</button>
    `
    listHeader.querySelector('#saves-create-btn').addEventListener('click', () => {
      const name = prompt('Name for this snapshot:', formatSnapshotName())
      if (name === null) return
      const trimmed = name.trim() || formatSnapshotName()
      const ok = createSave(trimmed)
      if (!ok) {
        alert('Could not save: local storage may be full.')
        return
      }
      refresh()
    })
    panel.appendChild(listHeader)

    // Named saves list
    const saves = getSaves()
    if (saves.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'saves-empty'
      empty.textContent = 'No snapshots yet. Click "+ Save Snapshot" to capture the current state.'
      panel.appendChild(empty)
    } else {
      const list = document.createElement('div')
      list.className = 'saves-list'
      for (const save of saves) {
        const row = document.createElement('div')
        row.className = 'save-row'
        row.innerHTML = `
          <div class="save-row-info">
            <span class="save-row-name">${esc(save.name)}</span>
            <span class="save-row-date">${formatAbsoluteTime(save.savedAt)}</span>
          </div>
          <div class="save-row-actions">
            <button class="btn" data-action="load">Load</button>
            <button class="btn btn-danger" data-action="delete">Delete</button>
          </div>
        `
        row.querySelector('[data-action="load"]').addEventListener('click', () => {
          if (!confirm(`Load snapshot "${save.name}"? Your current unsaved changes will be replaced by the auto-save, not lost — but loading will overwrite the current view.`)) return
          loadSave(save.id)
        })
        row.querySelector('[data-action="delete"]').addEventListener('click', () => {
          if (!confirm(`Delete snapshot "${save.name}"?`)) return
          deleteSave(save.id)
          refresh()
        })
        list.appendChild(row)
      }
      panel.appendChild(list)
    }
  }

  refresh()
  return panel
}

// ── Import dialog ─────────────────────────────────────────────────────────────

function showImportDialog(importedJson, existingCount) {
  const incoming = importedJson.cabinets.length
  const overlay = document.createElement('div')
  overlay.className = 'dialog-overlay'
  overlay.innerHTML = `
    <div class="dialog">
      <h3>Import Cabinets</h3>
      <p>
        You have ${existingCount} existing cabinet${existingCount !== 1 ? 's' : ''}.
        The file contains ${incoming} cabinet${incoming !== 1 ? 's' : ''}.
      </p>
      <p>How would you like to proceed?</p>
      <div class="dialog-actions">
        <button class="btn" id="dlg-cancel">Cancel</button>
        <button class="btn btn-danger" id="dlg-replace">Replace All</button>
        <button class="btn btn-primary" id="dlg-merge">Merge</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  overlay.querySelector('#dlg-cancel').addEventListener('click', () => overlay.remove())
  overlay.querySelector('#dlg-replace').addEventListener('click', () => {
    setState(importedJson)
    overlay.remove()
  })
  overlay.querySelector('#dlg-merge').addEventListener('click', () => {
    mergeImport(importedJson)
    overlay.remove()
  })
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })
}

function mergeImport(importedJson) {
  updateState(s => {
    const usedIds = new Set()
    for (const cab of s.cabinets) {
      usedIds.add(cab.id)
      for (const drawer of cab.drawers || []) {
        usedIds.add(drawer.id)
        for (const bin of drawer.bins || []) {
          if (bin.id) usedIds.add(bin.id)
        }
      }
    }

    const ensureId = (id, prefix) => {
      if (!id || usedIds.has(id)) id = uid(prefix)
      usedIds.add(id)
      return id
    }

    for (const cab of importedJson.cabinets) {
      cab.id = ensureId(cab.id, 'cabinet')
      for (const drawer of cab.drawers || []) {
        drawer.id = ensureId(drawer.id, 'drawer')
        for (const bin of drawer.bins || []) {
          if (bin.id !== undefined) bin.id = ensureId(bin.id, 'bin')
        }
      }
      s.cabinets.push(cab)
    }
  })
}

// ── Time helpers ──────────────────────────────────────────────────────────────

function formatRelativeTime(date) {
  const diff = Date.now() - date.getTime()
  const s = Math.floor(diff / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s} seconds ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} minute${m !== 1 ? 's' : ''} ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hour${h !== 1 ? 's' : ''} ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatAbsoluteTime(isoString) {
  const d = new Date(isoString)
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatSnapshotName() {
  return new Date().toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
