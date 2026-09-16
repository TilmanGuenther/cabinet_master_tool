/**
 * Order List / Prepare view — calculates target quantities and exports CSV.
 *
 * Global settings (persisted in state.orderSettings):
 *   roundTo     — round final qty to nearest N (default 100)
 *   fillPercent — fill target as % of bin volume (default 60)
 *   cartItems   — map of binKey → boolean for "in shopping cart"
 */

import { binVolumeML } from '../utils/volume.js'
import { getDensity } from '../data/densities.js'
import { partIdentity, partSku, skuLabel } from '../utils/partIdentity.js'
import { CATALOGS } from '../data/catalogs/index.js'
import { updateState } from '../state.js'

function roundToNearest(value, step) {
  if (!step || step <= 0) return Math.round(value)
  return Math.round(value / step) * step
}

export function renderOrderList(container, state) {
  const settings = state.orderSettings || {}
  const roundTo = settings.roundTo ?? 100
  const fillPercent = settings.fillPercent ?? 60
  const cartItems = settings.cartItems || {}

  const el = document.createElement('div')

  // ── Settings panel ────────────────────────────────────────────────────────────
  const settingsPanel = document.createElement('div')
  settingsPanel.className = 'section no-print'
  settingsPanel.innerHTML = `
    <div style="display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap;">
      <label style="display:flex;align-items:center;gap:0.4rem;">
        Round to:
        <input type="number" id="round-to-input" value="${roundTo}" min="1" step="1" style="width:80px">
      </label>
      <label style="display:flex;align-items:center;gap:0.4rem;">
        Fill:
        <input type="number" id="fill-pct-input" value="${fillPercent}" min="1" max="100" step="1" style="width:65px">%
      </label>
      <button class="btn btn-primary" id="export-csv-btn">Export CSV</button>
    </div>
  `
  el.appendChild(settingsPanel)

  // ── Table ──────────────────────────────────────────────────────────
  // With a single catalog the supplier is implied, so its column is left out
  // and the SKU column simply carries that supplier's own name for its numbers.
  const supplierIds  = Object.keys(CATALOGS)
  const multiSupplier = supplierIds.length > 1
  const skuHeading   = multiSupplier ? 'Part No.' : (CATALOGS[supplierIds[0]]?.skuLabel || 'Part No.')

  const table = document.createElement('table')
  table.innerHTML = `
    <thead>
      <tr>
        <th class="no-print">In Cart</th>
        <th>Description</th>
        ${multiSupplier ? '<th>Supplier</th>' : ''}
        <th>${esc(skuHeading)}</th>
        <th>Bin Size</th>
        <th>Vol (ml)</th>
        <th>Density (pcs/ml)</th>
        <th>Target Qty</th>
      </tr>
    </thead>
    <tbody id="order-tbody"></tbody>
  `
  el.appendChild(table)

  const tbody = table.querySelector('#order-tbody')
  const rows = []

  const allDrawers = (state.cabinets || []).flatMap(c => c.drawers || [])
  for (const drawer of allDrawers) {
    for (const bin of (drawer.bins || [])) {
      const part = bin.part || {}
      const effectiveHeightUnits = bin.heightUnits ?? (drawer.defaultHeightUnits ?? 6)
      const vol = binVolumeML(bin.w, bin.h, effectiveHeightUnits)
      // Bins with no part assigned still show a plausible quantity, as before.
      const density = getDensity({
        ...part,
        thread:   part.thread   || 'M3',
        headType: part.headType || 'socket',
      })
      const qty = roundToNearest(vol * density * (fillPercent / 100), roundTo)
      const binKey = bin.id || `${drawer.id}-${bin.w}-${bin.h}`
      const inCart = cartItems[binKey] || false

      rows.push({
        description: part.description || bin.id,
        supplier: partIdentity(part)?.supplier || '',
        sku: partSku(part),
        skuLabel: skuLabel(part),
        binSize: `${bin.w}x${bin.h} h${effectiveHeightUnits}`,
        vol,
        density,
        qty,
        binKey,
        inCart,
      })

      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td class="no-print" style="text-align:center">
          <input type="checkbox" class="cart-checkbox" data-key="${esc(binKey)}"${inCart ? ' checked' : ''}>
        </td>
        <td>${esc(part.description || bin.id)}</td>
        ${multiSupplier ? `<td>${esc(CATALOGS[partIdentity(part)?.supplier]?.brand || '—')}</td>` : ''}
        <td>${esc(partSku(part) || '—')}</td>
        <td>${bin.w}x${bin.h} h${effectiveHeightUnits}</td>
        <td>${vol.toFixed(1)}</td>
        <td>${density.toFixed(1)}</td>
        <td class="qty-cell">${qty}</td>
      `
      tbody.appendChild(tr)
    }
  }

  container.appendChild(el)

  // ── Recalculate qty cells on settings change ──────────────────────────────────
  function recalcQtys() {
    const newRoundTo = parseInt(el.querySelector('#round-to-input').value, 10) || 1
    const newFill = parseInt(el.querySelector('#fill-pct-input').value, 10) || 1
    rows.forEach((row, i) => {
      const newQty = roundToNearest(row.vol * row.density * (newFill / 100), newRoundTo)
      row.qty = newQty
      tbody.rows[i].querySelector('.qty-cell').textContent = newQty
    })
    updateState(s => {
      if (!s.orderSettings) s.orderSettings = {}
      s.orderSettings.roundTo = newRoundTo
      s.orderSettings.fillPercent = newFill
    })
  }

  el.querySelector('#round-to-input').addEventListener('change', recalcQtys)
  el.querySelector('#fill-pct-input').addEventListener('change', recalcQtys)

  // ── Checkbox persistence ──────────────────────────────────────────────────────
  tbody.addEventListener('change', e => {
    if (!e.target.classList.contains('cart-checkbox')) return
    const key = e.target.dataset.key
    const checked = e.target.checked
    const row = rows.find(r => r.binKey === key)
    if (row) row.inCart = checked
    updateState(s => {
      if (!s.orderSettings) s.orderSettings = {}
      if (!s.orderSettings.cartItems) s.orderSettings.cartItems = {}
      s.orderSettings.cartItems[key] = checked
    })
  })

  // ── CSV export ────────────────────────────────────────────────────────────────
  el.querySelector('#export-csv-btn').addEventListener('click', () => {
    const csvEsc = v => String(v ?? '').replace(/"/g, '""')

    // Order lists are placed with one vendor at a time, so each supplier gets
    // its own file rather than one mixed list a buyer has to split by hand.
    const bySupplier = new Map()
    for (const row of rows) {
      const key = row.supplier || 'unknown'
      if (!bySupplier.has(key)) bySupplier.set(key, [])
      bySupplier.get(key).push(row)
    }

    for (const [supplier, supplierRows] of bySupplier) {
      const heading = supplierRows[0]?.skuLabel || 'Part No.'
      const header  = `${heading},Description,Quantity`
      const lines   = supplierRows.map(r => `"${csvEsc(r.sku)}","${csvEsc(r.description)}",${r.qty}`)
      const csv     = [header, ...lines].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = bySupplier.size > 1 ? `order-list-${supplier}.csv` : 'order-list.csv'
      a.click()
      URL.revokeObjectURL(url)
    }
  })
}

function esc(str) {
  const d = document.createElement('div')
  d.textContent = str ?? ''
  return d.innerHTML
}
