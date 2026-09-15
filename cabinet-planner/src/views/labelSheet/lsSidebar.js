/**
 * Sidebar panel builders for the LabelSheet view.
 *
 * Each function receives `selectedKeys` (the module-level Set from LabelSheet.js)
 * as an explicit parameter so these functions can live outside that module.
 */

import { updateState } from '../../state.js'
import { mk, esc, parseBinKey, findBinInState } from './lsHelpers.js'

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function buildSidebar(panel, state, selectedKeys) {
  const heading = mk('div', 'dm-heading')
  heading.textContent = 'Label Properties'
  panel.appendChild(heading)

  if (selectedKeys.size === 0) {
    const empty = mk('div', 'dm-empty')
    empty.textContent = 'Click a label to view its properties.'
    panel.appendChild(empty)
    return
  }

  if (selectedKeys.size > 1) {
    buildMultiSidebar(panel, state, selectedKeys)
  } else {
    const [key] = selectedKeys
    buildSingleSidebar(panel, state, key)
  }
}

// ── Single-label sidebar ──────────────────────────────────────────────────────

export function buildSingleSidebar(panel, state, key) {
  const { cabId, drawId, binId } = parseBinKey(key)
  const cab    = state.cabinets?.find(c => c.id === cabId)
  const drawer = cab?.drawers?.find(d => d.id === drawId)
  const bin    = drawer?.bins?.find(b => b.id === binId)

  if (!bin) {
    const empty = mk('div', 'dm-empty')
    empty.textContent = 'Label not found.'
    panel.appendChild(empty)
    return
  }

  // Info rows
  const rows = [
    ['Cabinet', cab?.name || cabId],
    ['Drawer',  drawer?.label || drawId],
    ['Bin ID',  bin.id],
    ['Size',    `${bin.w || 1}\u202F\xD7\u202F${bin.h || 1} cells`],
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

  // Overrides section
  const overridesWrap = mk('div', 'dm-overrides')
  const oh = mk('div', 'dm-assigner-heading')
  oh.textContent = 'Label Overrides'
  overridesWrap.appendChild(oh)

  const overrides = bin.overrides || {}
  const part      = bin.part || {}

  function makeTextRow(label, field, placeholder) {
    const row = mk('div', 'dm-assigner-row')
    const lbl = mk('label', 'dm-assigner-lbl')
    lbl.textContent = label
    const input = mk('input', 'dm-override-input')
    input.type = 'text'
    input.value = overrides[field] ?? ''
    input.placeholder = placeholder || ''
    input.addEventListener('change', () => {
      updateState(s => {
        const b = findBinInState(s, cabId, drawId, binId)
        if (!b) return
        if (!b.overrides) b.overrides = {}
        const val = input.value.trim()
        if (val) {
          b.overrides[field] = val
        } else {
          delete b.overrides[field]
          if (Object.keys(b.overrides).length === 0) delete b.overrides
        }
      })
    })
    row.append(lbl, input)
    overridesWrap.appendChild(row)
  }

  makeTextRow('Description', 'description', part.description || bin.id)
  makeTextRow('Standard', 'standard', part.standard || '')
  makeTextRow('BN (barcode)', 'bn', part.bossardPN || '')

  function makeCb(id, label, field) {
    const row = mk('div', 'dm-override-cb-row')
    const cb  = mk('input')
    cb.type = 'checkbox'
    cb.className = 'dm-override-cb'
    cb.id = id
    cb.checked = !!overrides[field]
    cb.addEventListener('change', () => {
      updateState(s => {
        const b = findBinInState(s, cabId, drawId, binId)
        if (!b) return
        if (!b.overrides) b.overrides = {}
        if (cb.checked) {
          b.overrides[field] = true
        } else {
          delete b.overrides[field]
          if (Object.keys(b.overrides).length === 0) delete b.overrides
        }
      })
    })
    const lbl = mk('label', 'dm-override-cb-lbl')
    lbl.htmlFor = id
    lbl.textContent = label
    row.append(cb, lbl)
    overridesWrap.appendChild(row)
  }

  makeCb(`ls-cb-noimg-${bin.id}`,      'Disable image on label',           'disableImage')
  makeCb(`ls-cb-reducelen-${bin.id}`,  'Reduce image length (break mark)',  'reduceImageLength')
  makeCb(`ls-cb-ignoreicon-${bin.id}`, 'Ignore icon (text may overlap)',    'ignoreIcon')

  // Font size
  const fsRow = mk('div', 'dm-override-cb-row')
  const fsLbl = mk('label', 'dm-override-cb-lbl')
  fsLbl.htmlFor = `ls-cb-fontsize-${bin.id}`
  fsLbl.textContent = 'Desc. font size:'
  const fsInput = mk('input')
  fsInput.type = 'number'
  fsInput.min = '6'
  fsInput.max = '24'
  fsInput.id = `ls-cb-fontsize-${bin.id}`
  fsInput.className = 'dm-override-fontsize-input'
  fsInput.placeholder = 'px'
  fsInput.value = overrides.descFontSize != null ? String(overrides.descFontSize) : ''
  fsInput.addEventListener('change', () => {
    updateState(s => {
      const b = findBinInState(s, cabId, drawId, binId)
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
  overridesWrap.appendChild(fsRow)

  panel.appendChild(overridesWrap)
}

// ── Multi-label sidebar ───────────────────────────────────────────────────────

export function buildMultiSidebar(panel, state, selectedKeys) {
  const info = mk('div', 'dm-multisel-info')
  info.textContent = `${selectedKeys.size} labels selected`
  panel.appendChild(info)

  // Collect bins for selected keys
  const bins = []
  for (const key of selectedKeys) {
    const { cabId, drawId, binId } = parseBinKey(key)
    const bin = findBinInState(state, cabId, drawId, binId)
    if (bin) bins.push({ key, cabId, drawId, bin })
  }

  if (bins.length === 0) return

  const overridesWrap = mk('div', 'dm-overrides')
  const oh = mk('div', 'dm-assigner-heading')
  oh.textContent = 'Batch Overrides'
  overridesWrap.appendChild(oh)

  const hint = mk('div', 'dm-empty')
  hint.style.marginBottom = '10px'
  hint.textContent = 'Non-text fields apply to all selected labels.'
  overridesWrap.appendChild(hint)

  // Helper: collect all values for a boolean field across selected bins
  function collectBool(field) {
    const vals = bins.map(({ bin }) => !!(bin.overrides?.[field]))
    const allTrue  = vals.every(v => v)
    const allFalse = vals.every(v => !v)
    return { allTrue, allFalse, mixed: !allTrue && !allFalse }
  }

  // Helper: create a batch checkbox row with indeterminate support
  function makeBatchCb(id, label, field) {
    const { allTrue, mixed } = collectBool(field)
    const row = mk('div', 'dm-override-cb-row')
    const cb  = mk('input')
    cb.type = 'checkbox'
    cb.className = 'dm-override-cb'
    cb.id = id
    cb.checked = allTrue
    cb.indeterminate = mixed

    cb.addEventListener('change', () => {
      const newVal = cb.checked
      updateState(s => {
        for (const { cabId, drawId, bin } of bins) {
          const b = findBinInState(s, cabId, drawId, bin.id)
          if (!b) continue
          if (!b.overrides) b.overrides = {}
          if (newVal) {
            b.overrides[field] = true
          } else {
            delete b.overrides[field]
            if (Object.keys(b.overrides).length === 0) delete b.overrides
          }
        }
      })
    })

    const lbl = mk('label', 'dm-override-cb-lbl')
    lbl.htmlFor = id
    if (mixed) lbl.classList.add('ls-lbl-ambiguous')
    lbl.textContent = label
    row.append(cb, lbl)
    overridesWrap.appendChild(row)
  }

  makeBatchCb('ls-batch-noimg',      'Disable image on label',           'disableImage')
  makeBatchCb('ls-batch-reducelen',  'Reduce image length (break mark)',  'reduceImageLength')
  makeBatchCb('ls-batch-ignoreicon', 'Ignore icon (text may overlap)',    'ignoreIcon')

  // Font size batch field
  const allSizes = bins.map(({ bin }) => bin.overrides?.descFontSize ?? null)
  const firstSize = allSizes[0]
  const uniformSize = allSizes.every(v => v === firstSize)

  const fsRow = mk('div', 'dm-override-cb-row')
  const fsLbl = mk('label', 'dm-override-cb-lbl')
  fsLbl.htmlFor = 'ls-batch-fontsize'
  fsLbl.textContent = 'Desc. font size:'
  const fsInput = mk('input')
  fsInput.type = 'number'
  fsInput.min = '6'
  fsInput.max = '24'
  fsInput.id = 'ls-batch-fontsize'
  fsInput.className = 'dm-override-fontsize-input'
  fsInput.placeholder = uniformSize && firstSize != null ? String(firstSize) : 'mixed'
  fsInput.value = uniformSize && firstSize != null ? String(firstSize) : ''
  fsInput.addEventListener('change', () => {
    const v = parseInt(fsInput.value, 10)
    updateState(s => {
      for (const { cabId, drawId, bin } of bins) {
        const b = findBinInState(s, cabId, drawId, bin.id)
        if (!b) continue
        if (!b.overrides) b.overrides = {}
        if (!isNaN(v) && v >= 6 && v <= 24) {
          b.overrides.descFontSize = v
        } else {
          fsInput.value = ''
          delete b.overrides.descFontSize
          if (Object.keys(b.overrides).length === 0) delete b.overrides
        }
      }
    })
  })
  const fsPx = mk('span', 'dm-override-cb-lbl')
  fsPx.textContent = 'px'
  fsRow.append(fsLbl, fsInput, fsPx)
  overridesWrap.appendChild(fsRow)

  panel.appendChild(overridesWrap)
}
