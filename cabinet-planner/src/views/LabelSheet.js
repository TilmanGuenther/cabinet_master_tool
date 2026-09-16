/**
 * Label Sheet view — labels grouped by cabinet and drawer.
 * Each bin gets a label sized to the bin's physical width (bin.w * 42 - 6 mm)
 * and a fixed height of 11 mm.
 *
 * Layout per label:
 *   [Part Description]                          |
 *   [Standard]  | [Side view →] | [⬤ top view] |
 *   [CODE128 barcode]                           |
 *
 * For 1-wide bins only the primary view is shown (top for nuts/washers, side for screws).
 *
 * Labels are clickable to select them. The right sidebar shows override controls for
 * the selected label(s). Shift/Ctrl+click enables multi-selection with batch editing.
 */

import JsBarcode from 'jsbarcode'
import { barcodeValue } from '../utils/partIdentity.js'
import { hasSilhouette, silhouetteLayout } from '../data/partTypes/index.js'
import { triggerPrint } from '../utils/print.js'
import { getFastenerSVGLabel, getFastenerSVGLabelTop, getFastenerSVGLabelReduced } from '../utils/fastenerSvg.js'
import { getState } from '../state.js'
import { LABEL_H_MM, labelWidthMM, binKey, formatDesc } from './labelSheet/lsHelpers.js'
import { buildSidebar } from './labelSheet/lsSidebar.js'

// Persists across tab switches within a session
let _pageSize = 'A4'

// ── Module-level selection state (survives re-renders) ────────────────────────
let _selectedKeys  = new Set()  // "cabId::drawId::binId"
let _lastClickedKey = null      // for shift-range selection
let _allLabelKeys  = []         // ordered list for range selection
let _container     = null
let _rerenderListener = null
let _escHandler    = null
let _outsideHandler = null

// ── Re-render ─────────────────────────────────────────────────────────────────

function rerender() {
  if (!_container) return
  if (!_container.querySelector('.ls-layout') && _container.children.length > 0) return
  _container.innerHTML = ''
  renderLabelSheet(_container, getState())
}

function cleanup() {
  if (_rerenderListener) {
    document.removeEventListener('ls-rerender', _rerenderListener)
    _rerenderListener = null
  }
  if (_escHandler) {
    document.removeEventListener('keydown', _escHandler)
    _escHandler = null
  }
  if (_outsideHandler) {
    document.removeEventListener('mousedown', _outsideHandler)
    _outsideHandler = null
  }
}

// ── Click handler ─────────────────────────────────────────────────────────────

function handleLabelClick(key, e) {
  e.stopPropagation()

  if (e.ctrlKey || e.metaKey) {
    if (_selectedKeys.has(key)) {
      _selectedKeys.delete(key)
    } else {
      _selectedKeys.add(key)
      _lastClickedKey = key
    }
  } else if (e.shiftKey && _lastClickedKey) {
    const i1 = _allLabelKeys.indexOf(_lastClickedKey)
    const i2 = _allLabelKeys.indexOf(key)
    if (i1 >= 0 && i2 >= 0) {
      const lo = Math.min(i1, i2)
      const hi = Math.max(i1, i2)
      for (let i = lo; i <= hi; i++) _selectedKeys.add(_allLabelKeys[i])
    }
  } else {
    // Single-click: if this label is the only one selected, deselect it
    if (_selectedKeys.size === 1 && _selectedKeys.has(key)) {
      _selectedKeys.clear()
      _lastClickedKey = null
    } else {
      _selectedKeys.clear()
      _selectedKeys.add(key)
      _lastClickedKey = key
    }
  }

  document.dispatchEvent(new Event('ls-rerender'))
}

// ── Main export ───────────────────────────────────────────────────────────────

export function renderLabelSheet(container, state) {
  _container = container
  cleanup()

  // Register re-render event listener
  _rerenderListener = rerender
  document.addEventListener('ls-rerender', _rerenderListener)

  // Escape → deselect all
  _escHandler = (e) => {
    if (e.key === 'Escape' && _selectedKeys.size > 0) {
      _selectedKeys.clear()
      _lastClickedKey = null
      document.dispatchEvent(new Event('ls-rerender'))
    }
  }
  document.addEventListener('keydown', _escHandler)

  const layout = document.createElement('div')
  layout.className = 'ls-layout'

  // ── Left: content panel ───────────────────────────────────────────────────
  const contentPanel = document.createElement('div')
  contentPanel.className = 'ls-content-panel'

  // Toolbar
  const toolbar = document.createElement('div')
  toolbar.className = 'section no-print ls-toolbar'

  const pageSizeLabel = document.createElement('label')
  pageSizeLabel.className = 'ls-toolbar-label'
  pageSizeLabel.textContent = 'Page size:'
  toolbar.appendChild(pageSizeLabel)

  const pageSizeSelect = document.createElement('select')
  pageSizeSelect.className = 'ls-toolbar-select'
  for (const { value, text } of [
    { value: 'A4',     text: 'A4' },
    { value: 'A5',     text: 'A5' },
    { value: 'letter', text: 'Letter' },
    { value: 'legal',  text: 'Legal' },
  ]) {
    const opt = document.createElement('option')
    opt.value = value
    opt.textContent = text
    if (value === _pageSize) opt.selected = true
    pageSizeSelect.appendChild(opt)
  }
  pageSizeSelect.addEventListener('change', () => { _pageSize = pageSizeSelect.value })
  toolbar.appendChild(pageSizeSelect)

  const printBtn = document.createElement('button')
  printBtn.className = 'btn btn-primary'
  printBtn.textContent = 'Print All Labels'
  toolbar.appendChild(printBtn)

  contentPanel.appendChild(toolbar)

  // Labels area
  _allLabelKeys = []
  const labelsArea = document.createElement('div')
  labelsArea.className = 'ls-label-area'

  const cabinets = state.cabinets || []

  for (const cabinet of cabinets) {
    const cabSection = document.createElement('div')
    cabSection.className = 'ls-cabinet'

    const cabHeading = document.createElement('div')
    cabHeading.className = 'ls-cabinet-heading'
    cabHeading.textContent = cabinet.name || cabinet.id
    cabSection.appendChild(cabHeading)

    for (const drawer of (cabinet.drawers || [])) {
      const drawerSection = document.createElement('div')
      drawerSection.className = 'ls-drawer'

      // Drawer header row
      const drawerHeader = document.createElement('div')
      drawerHeader.className = 'ls-drawer-header no-print'

      const drawerTitle = document.createElement('div')
      drawerTitle.className = 'ls-drawer-title'

      if (drawer.color) {
        const swatch = document.createElement('span')
        swatch.className = 'ls-drawer-swatch'
        swatch.style.background = drawer.color
        drawerTitle.appendChild(swatch)
      }

      const nameSpan = document.createElement('span')
      nameSpan.className = 'ls-drawer-name'
      nameSpan.textContent = drawer.label || drawer.id
      drawerTitle.appendChild(nameSpan)

      drawerHeader.appendChild(drawerTitle)

      // Download buttons
      const dlGroup = document.createElement('div')
      dlGroup.className = 'ls-dl-group'

      const buttons = [
        { icon: '🏷️', label: 'Drawer Front Label', key: 'front' },
        { icon: '📦', label: 'Label Bundle', key: 'bundle' },
      ]

      for (const { icon, label, key } of buttons) {
        const btn = document.createElement('button')
        btn.className = 'btn ls-dl-btn'
        btn.innerHTML = `<span class="ls-dl-icon">${icon}</span> ${label}`
        btn.title = `Download: ${label}`

        if (key === 'bundle') {
          btn.addEventListener('click', () => {
            drawerSection.classList.add('print-target')
            cabSection.classList.add('print-target-cabinet')
            triggerPrint('single-drawer', { pageSize: _pageSize })
            drawerSection.classList.remove('print-target')
            cabSection.classList.remove('print-target-cabinet')
          })
        }

        dlGroup.appendChild(btn)
      }

      drawerHeader.appendChild(dlGroup)
      drawerSection.appendChild(drawerHeader)

      // Print-only section heading (shown in full label-sheet print, hidden on screen)
      const printHeading = document.createElement('div')
      printHeading.className = 'ls-drawer-print-heading'
      printHeading.textContent = `${cabinet.name || cabinet.id} — ${drawer.label || drawer.id}`
      drawerSection.appendChild(printHeading)

      // Label flow for this drawer
      const sheet = document.createElement('div')
      sheet.className = 'label-sheet'

      for (const bin of (drawer.bins || [])) {
        const wMM  = labelWidthMM(bin.w)
        const binW = bin.w || 1
        const part = bin.part || {}
        const ov   = bin.overrides || {}

        const key = binKey(cabinet.id, drawer.id, bin.id)
        _allLabelKeys.push(key)

        // Resolve effective values — overrides take precedence over part data
        const effectiveStandard    = 'standard' in ov ? ov.standard : (part.standard || '')
        const effectiveBN          = 'bn' in ov ? ov.bn : barcodeValue(part)
        const disableImage         = !!ov.disableImage
        const reduceImageLength    = !!ov.reduceImageLength
        const ignoreIcon           = !!ov.ignoreIcon
        const descFontSize         = Number.isFinite(ov.descFontSize) ? ov.descFontSize : null

        const label = document.createElement('div')
        label.className = 'label'
        if (ignoreIcon) label.classList.add('label-ignore-icon')
        if (_selectedKeys.has(key)) label.classList.add('label-selected')
        label.style.width  = `${wMM}mm`
        label.style.height = `${LABEL_H_MM}mm`
        label.dataset.key  = key
        label.addEventListener('click', (e) => handleLabelClick(key, e))

        // ── Left: description + standard + barcode ──────────────────────────
        const left = document.createElement('div')
        left.className = 'label-left'

        const descDiv = document.createElement('div')
        descDiv.className = 'label-desc'
        descDiv.textContent = ov.description || formatDesc(part) || bin.id
        if (descFontSize !== null) descDiv.style.fontSize = `${descFontSize}px`
        left.appendChild(descDiv)

        if (effectiveStandard) {
          const stdDiv = document.createElement('div')
          stdDiv.className = 'label-standards'
          stdDiv.textContent = effectiveStandard.replace(/\s*\([^)]*\)/g, '').trim()
          left.appendChild(stdDiv)
        }

        if (effectiveBN) {
          const barcodeDiv = document.createElement('div')
          barcodeDiv.className = 'label-barcode'
          const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          try {
            JsBarcode(svgEl, effectiveBN, {
              format: 'CODE128',
              width: 1,
              height: 20,
              margin: 0,
              displayValue: false,
              lineColor: '#111',
            })
          } catch { /* invalid BN — skip barcode */ }
          barcodeDiv.appendChild(svgEl)
          left.appendChild(barcodeDiv)
        }

        label.appendChild(left)

        // ── Right: icon(s) ──────────────────────────────────────────────────
        if (hasSilhouette(part) && !disableImage) {
          // Which view leads in a one-cell label is a property of the part type.
          const topIsFirst = silhouetteLayout(part) === 'top-first'
          const showSide = binW > 1 || !topIsFirst
          const showTop  = binW > 1 || topIsFirst

          const iconsDiv = document.createElement('div')
          iconsDiv.className = 'label-icons'

          if (showSide) {
            const sideDiv = document.createElement('div')
            sideDiv.className = 'label-icon-side'
            sideDiv.innerHTML = reduceImageLength
              ? getFastenerSVGLabelReduced(part)
              : getFastenerSVGLabel(part)
            iconsDiv.appendChild(sideDiv)
          }

          if (showTop) {
            const topDiv = document.createElement('div')
            topDiv.className = 'label-icon-top'
            topDiv.innerHTML = getFastenerSVGLabelTop(part)
            iconsDiv.appendChild(topDiv)
          }

          label.appendChild(iconsDiv)
        }

        sheet.appendChild(label)
      }

      drawerSection.appendChild(sheet)
      cabSection.appendChild(drawerSection)
    }

    labelsArea.appendChild(cabSection)
  }

  contentPanel.appendChild(labelsArea)
  layout.appendChild(contentPanel)

  // ── Right: sidebar ────────────────────────────────────────────────────────
  const sidebarPanel = document.createElement('div')
  sidebarPanel.className = 'ls-props-panel no-print'
  buildSidebar(sidebarPanel, state, _selectedKeys)
  layout.appendChild(sidebarPanel)

  container.appendChild(layout)

  // Click-outside: deselect when clicking outside labels and sidebar
  _outsideHandler = (e) => {
    if (_selectedKeys.size === 0) return
    if (e.target.closest('.label') || e.target.closest('.ls-props-panel')) return
    _selectedKeys.clear()
    _lastClickedKey = null
    document.dispatchEvent(new Event('ls-rerender'))
  }
  document.addEventListener('mousedown', _outsideHandler)

  printBtn.addEventListener('click', () => triggerPrint('label-sheet', { pageSize: _pageSize }))
}
