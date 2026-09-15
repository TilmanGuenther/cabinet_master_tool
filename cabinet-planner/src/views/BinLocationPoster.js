import { jsPDF, GState } from 'jspdf'

/**
 * Bin Location Poster — full-scale printable drawer map for placing under
 * the Gridfinity base grid.
 *
 * The SVG coordinate system uses millimetres directly (viewBox matches the
 * physical drawer interior in mm), so the printed output is 1:1 scale when
 * the browser page size is set to the drawer's interior dimensions.
 *
 * Label safe-zone rationale:
 *   The Gridfinity base-plate has structural rails ~4 mm wide centred on
 *   every 42 mm grid line, plus corner pillars at each intersection.
 *   BIN_INSET keeps the bin rectangle clear of those rails; SAFE_MARGIN
 *   keeps text clear of the bin rectangle edges, so labels remain readable
 *   through the gaps in the base-plate when the grid is placed on top.
 */

const CELL        = 42    // mm per Gridfinity base unit
const BIN_INSET   = 4     // mm from grid line to bin-rect edge
const CORNER_R    = 3     // bin-rect corner radius, mm
const SAFE_MARGIN = 5.5   // mm from bin-rect edge to label area
const PILLAR_R    = 1.2   // grid-intersection dot radius, mm

const FS_TITLE = 5.5   // title text, mm
const FS_AXIS  = 4     // column/row legend, mm
const FS_POS   = 3.2   // position badge inside bin, mm

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function colLetter(x) {
  return String.fromCharCode(65 + x)
}

/**
 * Compute an appropriate font size for text that must fit inside `availW` mm.
 * `charCount` is a rough estimate of the number of characters.
 * Returns a value clamped to [min, max].
 */
function fitFontSize(availW, charCount, min, max) {
  // Approximate: proportional font ≈ 0.58 × fontSize per character
  const fs = availW / (charCount * 0.58)
  return Math.max(min, Math.min(max, fs))
}


/** Build a complete SVG string for the poster. */
function buildPosterSVG(cabinet, drawer) {
  const W  = cabinet.innerWidthMM
  const H  = cabinet.innerDepthMM
  const gW = drawer.gridW * CELL
  const gH = drawer.gridH * CELL

  // Physical offset: grid centred inside drawer interior
  const offX = (W - gW) / 2
  const offY = (H - gH) / 2

  // Helpers: grid unit → mm position
  const gx = x => offX + x * CELL
  const gy = y => offY + y * CELL

  const parts = []

  // ── Background ──────────────────────────────────────────────────────────────
  parts.push(`<rect width="${W}" height="${H}" fill="white"/>`)

  // ── Grid area fill + border ──────────────────────────────────────────────────
  parts.push(
    `<rect x="${offX}" y="${offY}" width="${gW}" height="${gH}" ` +
    `fill="#f7f7f7" stroke="#888" stroke-width="0.4"/>`
  )

  // ── Grid lines ───────────────────────────────────────────────────────────────
  for (let x = 0; x <= drawer.gridW; x++) {
    parts.push(
      `<line x1="${gx(x)}" y1="${offY}" x2="${gx(x)}" y2="${offY + gH}" ` +
      `stroke="#d0d0d0" stroke-width="0.25"/>`
    )
  }
  for (let y = 0; y <= drawer.gridH; y++) {
    parts.push(
      `<line x1="${offX}" y1="${gy(y)}" x2="${offX + gW}" y2="${gy(y)}" ` +
      `stroke="#d0d0d0" stroke-width="0.25"/>`
    )
  }

  // ── Pillar dots at grid intersections ────────────────────────────────────────
  // These mark where the Gridfinity base-plate has corner pillars, so the user
  // knows which spots are structurally opaque from below.
  for (let x = 0; x <= drawer.gridW; x++) {
    for (let y = 0; y <= drawer.gridH; y++) {
      parts.push(
        `<circle cx="${gx(x)}" cy="${gy(y)}" r="${PILLAR_R}" fill="#bbb"/>`
      )
    }
  }

  // ── Empty-cell coordinate labels ─────────────────────────────────────────────
  // Build a set of all cells occupied by a bin for quick lookup
  const occupiedCells = new Set()
  for (const bin of (drawer.bins || [])) {
    for (let dx = 0; dx < bin.w; dx++) {
      for (let dy = 0; dy < bin.h; dy++) {
        occupiedCells.add(`${bin.x + dx},${bin.y + dy}`)
      }
    }
  }

  for (let cy = 0; cy < drawer.gridH; cy++) {
    for (let cx = 0; cx < drawer.gridW; cx++) {
      if (occupiedCells.has(`${cx},${cy}`)) continue
      const cellCX = gx(cx) + CELL / 2
      const cellCY = gy(cy) + CELL / 2
      const coordLabel = `${colLetter(cx)}${cy + 1}`
      parts.push(
        `<text x="${cellCX}" y="${cellCY}" ` +
        `font-family="monospace" font-size="${FS_POS}" ` +
        `text-anchor="middle" dominant-baseline="middle" ` +
        `fill="#ccc">${esc(coordLabel)}</text>`
      )
    }
  }

  // ── Bins ─────────────────────────────────────────────────────────────────────
  const themeColor = drawer.color || '#777'

  for (const bin of (drawer.bins || [])) {
    const bx  = gx(bin.x) + BIN_INSET
    const by  = gy(bin.y) + BIN_INSET
    const bw  = bin.w * CELL - 2 * BIN_INSET
    const bh  = bin.h * CELL - 2 * BIN_INSET

    const stroke = themeColor
    const fill   = `${stroke}28`   // ~16 % opacity tint

    // Bin outline rectangle
    parts.push(
      `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" ` +
      `rx="${CORNER_R}" ry="${CORNER_R}" ` +
      `fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>`
    )

    // ── All text is clipped to the first (top-left) grid cell of the bin ─────
    // This prevents grid lines from slicing through multi-cell bin labels.
    const clipId  = `clip-${bin.id || `${bin.x}-${bin.y}`}`
    const clipX   = gx(bin.x) + BIN_INSET
    const clipY   = gy(bin.y) + BIN_INSET
    const clipW   = CELL - 2 * BIN_INSET
    const clipH   = CELL - 2 * BIN_INSET
    parts.push(
      `<clipPath id="${clipId}">` +
        `<rect x="${clipX}" y="${clipY}" width="${clipW}" height="${clipH}" ` +
        `rx="${CORNER_R}" ry="${CORNER_R}"/>` +
      `</clipPath>`
    )

    // Text area is the first cell safe zone
    const safeW  = clipW - 2 * SAFE_MARGIN
    const safeH  = clipH - 2 * SAFE_MARGIN
    const centX  = clipX + clipW / 2
    const centY  = clipY + clipH / 2

    // ── Position badge (top-left corner, inside first cell) ──────────────────
    const posLabel = `${colLetter(bin.x)}${bin.y + 1}`
    parts.push(
      `<text x="${clipX + 2}" y="${clipY + 2}" ` +
      `font-family="monospace" font-size="${FS_POS}" font-weight="bold" ` +
      `fill="${stroke}" dominant-baseline="hanging" clip-path="url(#${clipId})">${esc(posLabel)}</text>`
    )

    if (bin.part) {
      const thr  = bin.part.thread || ''
      const len  = bin.part.length != null ? ` × ${bin.part.length}` : ''
      const threadStr = thr + len
      const headStr   = bin.part.headType || ''
      const pnStr     = bin.part.bossardPN || bin.part.standard || ''

      // Font sizes: constrained by both height and width so text never overflows.
      // Bold text has wider characters (~0.62 factor); regular uses 0.58.
      const fsThread = threadStr
        ? Math.max(3.5, Math.min(9, safeH / 3.2, safeW / (threadStr.length * 0.62)))
        : 0
      const fsHead = headStr
        ? Math.max(2.5, Math.min(5.5, safeH / 6.5, safeW / (headStr.length * 0.58)))
        : 0
      const fsPN = pnStr
        ? Math.max(2.2, Math.min(4, safeH / 8, safeW / (pnStr.length * 0.58)))
        : 0

      const GAP = 1.0  // mm gap between lines

      const lines = []
      if (threadStr) lines.push({ text: threadStr, fs: fsThread, fill: stroke,  bold: true  })
      if (headStr)   lines.push({ text: headStr,   fs: fsHead,   fill: '#444',  bold: false })
      if (pnStr)     lines.push({ text: pnStr,     fs: fsPN,     fill: '#888',  bold: false })

      if (lines.length) {
        const totalH = lines.reduce((s, l) => s + l.fs, 0) + GAP * (lines.length - 1)
        let lineTopY = centY - totalH / 2

        for (const ln of lines) {
          parts.push(
            `<text x="${centX}" y="${lineTopY + ln.fs / 2}" ` +
            `font-family="sans-serif" font-size="${ln.fs}" ` +
            (ln.bold ? 'font-weight="bold" ' : '') +
            `text-anchor="middle" dominant-baseline="middle" ` +
            `fill="${ln.fill}" clip-path="url(#${clipId})">${esc(ln.text)}</text>`
          )
          lineTopY += ln.fs + GAP
        }
      }
    } else {
      // Empty bin placeholder
      const fsEmpty = Math.max(3, Math.min(5, safeH / 5))
      parts.push(
        `<text x="${centX}" y="${centY}" ` +
        `font-family="sans-serif" font-size="${fsEmpty}" ` +
        `text-anchor="middle" dominant-baseline="middle" ` +
        `fill="#ccc" font-style="italic" clip-path="url(#${clipId})">empty</text>`
      )
    }
  }

  // ── Column letters (top & bottom margins) ────────────────────────────────────
  for (let x = 0; x < drawer.gridW; x++) {
    const cx = gx(x) + CELL / 2
    const letter = colLetter(x)
    parts.push(
      `<text x="${cx}" y="${offY - 1.5}" ` +
      `font-family="monospace" font-size="${FS_AXIS}" ` +
      `text-anchor="middle" dominant-baseline="auto" fill="#666">${letter}</text>`
    )
    parts.push(
      `<text x="${cx}" y="${offY + gH + 1.5}" ` +
      `font-family="monospace" font-size="${FS_AXIS}" ` +
      `text-anchor="middle" dominant-baseline="hanging" fill="#666">${letter}</text>`
    )
  }

  // ── Row numbers (left & right margins) ──────────────────────────────────────
  for (let y = 0; y < drawer.gridH; y++) {
    const cy = gy(y) + CELL / 2
    parts.push(
      `<text x="${offX - 1.5}" y="${cy}" ` +
      `font-family="monospace" font-size="${FS_AXIS}" ` +
      `text-anchor="end" dominant-baseline="middle" fill="#666">${y + 1}</text>`
    )
    parts.push(
      `<text x="${offX + gW + 1.5}" y="${cy}" ` +
      `font-family="monospace" font-size="${FS_AXIS}" ` +
      `text-anchor="start" dominant-baseline="middle" fill="#666">${y + 1}</text>`
    )
  }

  // ── Title ────────────────────────────────────────────────────────────────────
  // Placed vertically centred in the top margin above the grid.
  if (offY > 3) {
    parts.push(
      `<text x="${W / 2}" y="${offY / 2}" ` +
      `font-family="sans-serif" font-size="${FS_TITLE}" font-weight="600" ` +
      `text-anchor="middle" dominant-baseline="middle" fill="#333">` +
      `${esc(cabinet.name || cabinet.id)} — ${esc(drawer.label || drawer.id)}</text>`
    )
  }

  // ── Scale bar + legend (bottom margin) ──────────────────────────────────────
  if (offY > 5) {
    const sbY  = offY + gH + offY * 0.55
    const sbX1 = offX
    const sbX2 = offX + CELL   // 42 mm = 1 cell
    const ht   = 0.7

    // Bar
    parts.push(
      `<rect x="${sbX1}" y="${sbY - ht / 2}" width="${CELL}" height="${ht}" fill="#888"/>`
    )
    // End ticks
    parts.push(`<rect x="${sbX1}" y="${sbY - 2}" width="0.5" height="4" fill="#888"/>`)
    parts.push(`<rect x="${sbX2}" y="${sbY - 2}" width="0.5" height="4" fill="#888"/>`)
    // Label
    parts.push(
      `<text x="${(sbX1 + sbX2) / 2}" y="${sbY + 3}" ` +
      `font-family="sans-serif" font-size="3" ` +
      `text-anchor="middle" dominant-baseline="hanging" fill="#888">42 mm · 1 cell</text>`
    )

  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `id="poster-svg" ` +
    `viewBox="0 0 ${W} ${H}" ` +
    `style="width:100%;height:auto;display:block">` +
    parts.join('') +
    `</svg>`
  )
}

/** Download the poster as an SVG file sized to the drawer's physical dimensions. */
function exportPosterSVG(cabinet, drawer) {
  const W = cabinet.innerWidthMM
  const H = cabinet.innerDepthMM

  // Build SVG and replace the responsive preview style with explicit mm dimensions
  // so Acrobat and vector editors know the true physical size.
  const svgContent = buildPosterSVG(cabinet, drawer).replace(
    'style="width:100%;height:auto;display:block"',
    `width="${W}mm" height="${H}mm"`
  )

  const filename = `drawer-map_${cabinet.name}_${drawer.label}`
    .replace(/[^a-z0-9_\-]/gi, '_') + '.svg'

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Build a jsPDF document for the poster using jsPDF drawing primitives.
 * Drawing directly (rather than converting the SVG) gives correct transparency
 * and clean embedded fonts.
 *
 * Font note: jsPDF's built-in Helvetica is used because Bahnschrift (the ideal
 * match) is a proprietary Windows font that cannot be bundled in a public repo.
 * To use Bahnschrift: load the .ttf as base64, call doc.addFileToVFS /
 * doc.addFont before this function, and replace 'helvetica' with 'Bahnschrift'.
 */
function buildPosterPDF(cabinet, drawer) {
  const W  = cabinet.innerWidthMM
  const H  = cabinet.innerDepthMM
  const gW = drawer.gridW * CELL
  const gH = drawer.gridH * CELL

  const offX = (W - gW) / 2
  const offY = (H - gH) / 2

  const gx = x => offX + x * CELL
  const gy = y => offY + y * CELL

  // jsPDF swaps format dims when they conflict with orientation, so match them.
  const doc = new jsPDF({ orientation: W >= H ? 'l' : 'p', unit: 'mm', format: [W, H] })

  // Convert mm font size to pt (jsPDF always takes pt for setFontSize).
  const mmToPt = mm => mm / 0.3528

  // Parse #RRGGBB → [r, g, b].
  function hexRGB(hex) {
    const h = hex.replace('#', '')
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }

  // ── Background ──────────────────────────────────────────────────────────────
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, W, H, 'F')

  // ── Grid area ───────────────────────────────────────────────────────────────
  doc.setFillColor(247, 247, 247)
  doc.setDrawColor(136, 136, 136)
  doc.setLineWidth(0.4)
  doc.rect(offX, offY, gW, gH, 'FD')

  // ── Grid lines ───────────────────────────────────────────────────────────────
  doc.setDrawColor(208, 208, 208)
  doc.setLineWidth(0.25)
  for (let x = 0; x <= drawer.gridW; x++) doc.line(gx(x), offY, gx(x), offY + gH)
  for (let y = 0; y <= drawer.gridH; y++) doc.line(offX, gy(y), offX + gW, gy(y))

  // ── Pillar dots ──────────────────────────────────────────────────────────────
  doc.setFillColor(187, 187, 187)
  for (let x = 0; x <= drawer.gridW; x++) {
    for (let y = 0; y <= drawer.gridH; y++) {
      doc.circle(gx(x), gy(y), PILLAR_R, 'F')
    }
  }

  // ── Empty-cell coordinate labels ─────────────────────────────────────────────
  const occupiedCells = new Set()
  for (const bin of drawer.bins) {
    for (let dx = 0; dx < bin.w; dx++) {
      for (let dy = 0; dy < bin.h; dy++) {
        occupiedCells.add(`${bin.x + dx},${bin.y + dy}`)
      }
    }
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(mmToPt(FS_POS))
  doc.setTextColor(204, 204, 204)
  for (let cy = 0; cy < drawer.gridH; cy++) {
    for (let cx = 0; cx < drawer.gridW; cx++) {
      if (occupiedCells.has(`${cx},${cy}`)) continue
      doc.text(
        `${colLetter(cx)}${cy + 1}`,
        gx(cx) + CELL / 2, gy(cy) + CELL / 2,
        { align: 'center', baseline: 'middle' }
      )
    }
  }

  // ── Bins ─────────────────────────────────────────────────────────────────────
  const themeColor = drawer.color || '#777'
  const [tr, tg, tb] = hexRGB(themeColor)

  for (const bin of drawer.bins) {
    const bx = gx(bin.x) + BIN_INSET
    const by = gy(bin.y) + BIN_INSET
    const bw = bin.w * CELL - 2 * BIN_INSET
    const bh = bin.h * CELL - 2 * BIN_INSET

    // Fill at ~16 % opacity (matches the SVG's #RRGGBBXX = 0x28 = 40/255 ≈ 0.157)
    doc.saveGraphicsState()
    doc.setGState(new GState({ opacity: 0.157 }))
    doc.setFillColor(tr, tg, tb)
    doc.roundedRect(bx, by, bw, bh, CORNER_R, CORNER_R, 'F')
    doc.restoreGraphicsState()

    // Stroke at full opacity
    doc.setDrawColor(tr, tg, tb)
    doc.setLineWidth(1.2)
    doc.roundedRect(bx, by, bw, bh, CORNER_R, CORNER_R, 'D')

    // Text is laid out within the first (top-left) cell of the bin, matching
    // the SVG's clipPath. Font sizes are already constrained to fit by
    // fitFontSize(), so explicit PDF clipping is not needed.
    const clipX = gx(bin.x) + BIN_INSET
    const clipY = gy(bin.y) + BIN_INSET
    const clipW = CELL - 2 * BIN_INSET
    const clipH = CELL - 2 * BIN_INSET
    const safeW = clipW - 2 * SAFE_MARGIN
    const safeH = clipH - 2 * SAFE_MARGIN
    const centX = clipX + clipW / 2
    const centY = clipY + clipH / 2

    // Position badge (top-left corner)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(mmToPt(FS_POS))
    doc.setTextColor(tr, tg, tb)
    doc.text(`${colLetter(bin.x)}${bin.y + 1}`, clipX + 2, clipY + 2, { baseline: 'top' })

    if (bin.part) {
      const thr       = bin.part.thread || ''
      const len       = bin.part.length != null ? ` × ${bin.part.length}` : ''
      const threadStr = thr + len
      const headStr   = bin.part.headType || ''
      const pnStr     = bin.part.bossardPN || bin.part.standard || ''

      const fsThread = threadStr ? Math.max(3.5, Math.min(9,   safeH / 3.2, safeW / (threadStr.length * 0.62))) : 0
      const fsHead   = headStr   ? Math.max(2.5, Math.min(5.5, safeH / 6.5, safeW / (headStr.length   * 0.58))) : 0
      const fsPN     = pnStr     ? Math.max(2.2, Math.min(4,   safeH / 8,   safeW / (pnStr.length     * 0.58))) : 0

      const GAP   = 1.0
      const lines = []
      if (threadStr) lines.push({ text: threadStr, fs: fsThread, color: [tr, tg, tb],     bold: true  })
      if (headStr)   lines.push({ text: headStr,   fs: fsHead,   color: [68, 68, 68],      bold: false })
      if (pnStr)     lines.push({ text: pnStr,     fs: fsPN,     color: [136, 136, 136],   bold: false })

      if (lines.length) {
        const totalH  = lines.reduce((s, l) => s + l.fs, 0) + GAP * (lines.length - 1)
        let lineTopY  = centY - totalH / 2
        for (const ln of lines) {
          doc.setFont('helvetica', ln.bold ? 'bold' : 'normal')
          doc.setFontSize(mmToPt(ln.fs))
          doc.setTextColor(...ln.color)
          doc.text(ln.text, centX, lineTopY + ln.fs / 2, { align: 'center', baseline: 'middle' })
          lineTopY += ln.fs + GAP
        }
      }
    } else {
      const fsEmpty = Math.max(3, Math.min(5, safeH / 5))
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(mmToPt(fsEmpty))
      doc.setTextColor(204, 204, 204)
      doc.text('empty', centX, centY, { align: 'center', baseline: 'middle' })
    }
  }

  // ── Column letters (top & bottom) ────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(mmToPt(FS_AXIS))
  doc.setTextColor(102, 102, 102)
  for (let x = 0; x < drawer.gridW; x++) {
    const cx = gx(x) + CELL / 2
    doc.text(colLetter(x), cx, offY - 1.5,        { align: 'center', baseline: 'bottom' })
    doc.text(colLetter(x), cx, offY + gH + 1.5,   { align: 'center', baseline: 'top'    })
  }

  // ── Row numbers (left & right) ───────────────────────────────────────────────
  for (let y = 0; y < drawer.gridH; y++) {
    const cy = gy(y) + CELL / 2
    doc.text(String(y + 1), offX - 1.5,        cy, { align: 'right',  baseline: 'middle' })
    doc.text(String(y + 1), offX + gW + 1.5,   cy, { align: 'left',   baseline: 'middle' })
  }

  // ── Title ────────────────────────────────────────────────────────────────────
  if (offY > 3) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(mmToPt(FS_TITLE))
    doc.setTextColor(51, 51, 51)
    doc.text(`${cabinet.name} — ${drawer.label}`, W / 2, offY / 2, { align: 'center', baseline: 'middle' })
  }

  // ── Scale bar ────────────────────────────────────────────────────────────────
  if (offY > 5) {
    const sbY  = offY + gH + offY * 0.55
    const sbX1 = offX
    const sbX2 = offX + CELL
    doc.setFillColor(136, 136, 136)
    doc.setDrawColor(136, 136, 136)
    doc.setLineWidth(0.7)
    doc.line(sbX1, sbY, sbX2, sbY)
    doc.line(sbX1, sbY - 2, sbX1, sbY + 2)
    doc.line(sbX2, sbY - 2, sbX2, sbY + 2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(mmToPt(3))
    doc.text('42 mm · 1 cell', (sbX1 + sbX2) / 2, sbY + 3, { align: 'center', baseline: 'top' })
  }

  return doc
}

/** Download the poster as a PDF file sized exactly to the drawer's physical dimensions. */
function exportPosterPDF(cabinet, drawer) {
  const doc      = buildPosterPDF(cabinet, drawer)
  const filename = `drawer-map_${cabinet.name}_${drawer.label}`
    .replace(/[^a-z0-9_\-]/gi, '_') + '.pdf'
  doc.save(filename)
}

export function renderBinLocationPoster(container, state) {
  const { cabinets } = state

  if (!cabinets || cabinets.length === 0) {
    container.innerHTML = '<p style="padding:20px;color:#666">No cabinets configured. Go to Setup first.</p>'
    return
  }

  // Persist selection across state updates
  if (!renderBinLocationPoster._cabId || !cabinets.find(c => c.id === renderBinLocationPoster._cabId)) {
    renderBinLocationPoster._cabId = cabinets[0].id
  }
  let selCabId  = renderBinLocationPoster._cabId
  let selCab    = cabinets.find(c => c.id === selCabId) || cabinets[0]

  if (!renderBinLocationPoster._drawId || !selCab.drawers?.find(d => d.id === renderBinLocationPoster._drawId)) {
    renderBinLocationPoster._drawId = selCab.drawers?.[0]?.id
  }
  let selDrawId = renderBinLocationPoster._drawId
  let selDraw   = selCab.drawers?.find(d => d.id === selDrawId) || selCab.drawers?.[0]

  function render() {
    selCab  = cabinets.find(c => c.id === selCabId) || cabinets[0]
    selDraw = selCab.drawers?.find(d => d.id === selDrawId) || selCab.drawers?.[0]

    const cabOptions = cabinets.map(c =>
      `<option value="${esc(c.id)}" ${c.id === selCabId ? 'selected' : ''}>${esc(c.name)}</option>`
    ).join('')

    const drawOptions = (selCab.drawers || []).map(d =>
      `<option value="${esc(d.id)}" ${d.id === selDraw?.id ? 'selected' : ''}>${esc(d.label)}</option>`
    ).join('')

    const posterHTML = selDraw
      ? buildPosterSVG(selCab, selDraw)
      : '<p style="padding:20px;color:#666">No drawers in this cabinet.</p>'

    container.innerHTML = `
      <div class="poster-toolbar no-print">
        <div class="poster-toolbar-row">
          <label class="poster-label">Cabinet
            <select id="poster-cab-sel" class="poster-select">${cabOptions}</select>
          </label>
          <label class="poster-label">Drawer
            <select id="poster-draw-sel" class="poster-select">${drawOptions}</select>
          </label>
          <button id="poster-print-btn" class="poster-print-btn">
            &#x2B07; Export SVG
          </button>
          <button id="poster-pdf-btn" class="poster-print-btn">
            &#x2B07; Export PDF
          </button>
        </div>
        <p class="poster-hint">
          Downloads a file sized exactly to the drawer interior
          (${selCab.innerWidthMM}&nbsp;×&nbsp;${selCab.innerDepthMM}&nbsp;mm).
          <strong>PDF</strong>: ready to print at 1:1&nbsp;scale directly from any PDF viewer.
          Use <em>poster&nbsp;print</em> (tile across sheets) for large drawers.
          <strong>SVG</strong>: editable in Inkscape, Illustrator, or Acrobat.
        </p>
      </div>
      <div class="poster-preview-scroll">
        <div class="poster-preview-inner">
          ${posterHTML}
        </div>
      </div>
    `

    container.querySelector('#poster-cab-sel').addEventListener('change', e => {
      selCabId  = e.target.value
      renderBinLocationPoster._cabId = selCabId
      const newCab = cabinets.find(c => c.id === selCabId)
      selDrawId = newCab?.drawers?.[0]?.id
      renderBinLocationPoster._drawId = selDrawId
      render()
    })

    container.querySelector('#poster-draw-sel').addEventListener('change', e => {
      selDrawId = e.target.value
      renderBinLocationPoster._drawId = selDrawId
      render()
    })

    container.querySelector('#poster-print-btn').addEventListener('click', () => {
      if (selCab && selDraw) exportPosterSVG(selCab, selDraw)
    })

    container.querySelector('#poster-pdf-btn').addEventListener('click', () => {
      if (selCab && selDraw) exportPosterPDF(selCab, selDraw)
    })
  }

  render()
}
