/**
 * fastenerSvg.js
 * Generates B&W SVG silhouette icons for fasteners.
 *
 * Two-panel layout:
 *   Left  panel (0–44):  top/drive view  — looking straight down at the head
 *   Right panel (50–96): side profile    — proportional to real DIN/ISO geometry
 *
 * Usage:
 *   getFastenerSVG(part)         → SVG string (for innerHTML)
 *   makeFastenerSVGEl(part)      → <div class="fastener-icon"> wrapping the SVG
 */

import { d, f, screwDims, washerDims, isSquareNut, isMFStandoff } from './fastenerDims.js'
import { makeTopView, makeSideView } from './fastenerShapes.js'

// ── SVG layout constants ──────────────────────────────────────────────────────

const VW = 96   // viewBox width
const VH = 48   // viewBox height
// Left panel: 0–44  (top/drive view)
const L_CX = 22
const L_CY = 24
const L_R  = 17.5
// Divider at x=47
// Right panel: 50–96  (side profile)
const R_X = 50
const R_W = 46
const R_Y = 1
const R_H = VH - 2

const BREAK_W = 2.2   // mm — width of the break zone

const SCREW_TYPES = new Set(['socket', 'low-socket', 'button', 'countersunk', 'pan', 'flat'])

// ── Physical size helpers ─────────────────────────────────────────────────────

/**
 * Returns the mm-per-SVG-unit scale for the given part (based on the side panel
 * scale factor used during rendering).  Used to embed physical dimensions in mm
 * on the SVG element so labels can render at 1:1 scale.
 */
function computeMmPerUnit(part) {
  const nomD = d(part.thread)
  const len  = part.length || 10
  const ht   = part.headType
  let scale

  if (SCREW_TYPES.has(ht) || !ht) {
    const dims = screwDims(ht || 'socket', nomD)
    scale = Math.min((R_H * 0.88) / (dims.headH + len), (R_W * 0.70) / dims.headW)
  } else if (ht === 'nut') {
    const sq = isSquareNut(part)
    const nyloc = !sq && (part.description?.toLowerCase().includes('nyloc') || part.standard?.includes('985'))
    const totalH = (sq ? nomD * 0.60 : nomD * 0.80) * (nyloc ? 1.50 : 1.0)
    const bodyW  = sq ? nomD * 2.5 : nomD * 1.75
    scale = Math.min((R_H * 0.72) / totalH, (R_W * 0.72) / bodyW)
  } else if (ht === 'washer') {
    const wd = washerDims(part)
    scale = Math.min((R_H * 0.55) / wd.thick, (R_W * 0.82) / wd.outerD)
  } else if (ht === 'standoff') {
    const studH = isMFStandoff(part) ? nomD * 1.2 : 0
    scale = Math.min((R_H * 0.88) / (len + studH), (R_W * 0.72) / (nomD * 1.75))
  } else if (ht === 'pin') {
    scale = Math.min((R_H * 0.88) / len, (R_W * 0.55) / nomD)
  } else if (ht === 'insert') {
    scale = Math.min((R_H * 0.88) / len, (R_W * 0.72) / (nomD * 1.8))
  } else if (ht === 'set-screw') {
    scale = Math.min((R_H * 0.88) / len, (R_W * 0.55) / nomD)
  } else if (ht === 'press-nut') {
    const totalH = nomD * 1.05   // flangeH + bodyH
    const flangeW = nomD * 1.85
    scale = Math.min((R_H * 0.72) / totalH, (R_W * 0.82) / flangeW)
  } else {
    const dims = screwDims('socket', nomD)
    scale = Math.min((R_H * 0.88) / (dims.headH + len), (R_W * 0.70) / dims.headW)
  }

  return 1 / scale
}

// ── Break-mark helper (used by getFastenerSVGLabelReduced) ───────────────────

/**
 * Draws an S-break mark centred on the rectangle (x, yTop)..(x+BREAK_W, yBot).
 *
 * Instead of a white rectangle (which creates mismatched flat cut edges), the
 * entire break zone is an S-shaped closed band:
 *   - Two S-curve Béziers (left and right) form the band boundaries
 *   - The closed path is flood-filled white → erases the body with wavy edges
 *   - The same S-curves are re-drawn on top with a black stroke → visible break lines
 * There are no horizontal cut lines at the body edges; the S-curves are the sole
 * visible boundary.  The curves extend slightly above/below the body (ext) so the
 * break marks are taller than the cross-section and clearly visible.
 */
function breakMark(x, yTop, yBot) {
  const h  = yBot - yTop
  const ext = Math.min(h * 0.35, 1.5)
  const y1  = yTop - ext
  const y2  = yBot + ext
  const H   = y2 - y1                          // full height of the S-curve region
  const x2  = x + BREAK_W
  // S-curve horizontal deviation — enough to be visible but stays within ±BREAK_W/2
  const zm  = Math.min(BREAK_W * 0.5, h * 0.28, 1.2)

  // Closed S-shaped band: down the left S-curve, across the bottom, up the right
  // S-curve (reversed), close at the top.  Filled white → masks body geometry.
  const band =
    `M ${f(x)},${f(y1)} ` +
    `C ${f(x+zm)},${f(y1+H*0.3)} ${f(x-zm)},${f(y1+H*0.7)} ${f(x)},${f(y2)} ` +
    `L ${f(x2)},${f(y2)} ` +
    `C ${f(x2-zm)},${f(y1+H*0.7)} ${f(x2+zm)},${f(y1+H*0.3)} ${f(x2)},${f(y1)} ` +
    `Z`

  // Same S-curves re-drawn as black outlines (no fill) on top of the white band
  const leftS  = `M ${f(x)},${f(y1)} C ${f(x+zm)},${f(y1+H*0.3)} ${f(x-zm)},${f(y1+H*0.7)} ${f(x)},${f(y2)}`
  const rightS = `M ${f(x2)},${f(y1)} C ${f(x2+zm)},${f(y1+H*0.3)} ${f(x2-zm)},${f(y1+H*0.7)} ${f(x2)},${f(y2)}`

  return (
    `<path d="${band}" fill="white" stroke="none"/>` +
    `<path d="${leftS}" fill="none" stroke="#111" stroke-width="0.65"/>` +
    `<path d="${rightS}" fill="none" stroke="#111" stroke-width="0.65"/>`
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns an SVG string for the given part object.
 * viewBox="0 0 96 48"; explicit width/height in mm reflect physical part size
 * so CSS max-height on labels produces 1:1 scale rendering.
 * The side profile panel is rotated 90° to show the part horizontally
 * (head near the divider on the left, shaft extending right).
 */
export function getFastenerSVG(part) {
  if (!part?.headType) return ''

  const topView  = makeTopView(part)
  const sideView = makeSideView(part)
  const divider  = `<line x1="47" y1="3" x2="47" y2="${VH - 3}" stroke="#bbb" stroke-width="0.6"/>`

  // Rotate side panel so fastener lies horizontal (head left, shaft right)
  const sideCX = R_X + R_W / 2   // 73
  const sideCY = R_Y + R_H / 2   // 24
  const rotatedSide = `<g transform="rotate(-90,${sideCX},${sideCY})">${sideView}</g>`

  // Physical dimensions for 1:1-scale label rendering
  const mpu = computeMmPerUnit(part)
  const wMM = (VW * mpu).toFixed(1)
  const hMM = (VH * mpu).toFixed(1)

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="0 0 ${VW} ${VH}" width="${wMM}mm" height="${hMM}mm" ` +
    `class="fastener-svg" aria-hidden="true">` +
    topView + divider + rotatedSide +
    `</svg>`
  )
}

/**
 * Compact horizontal side-view SVG for bin labels.
 * Drawn at 1 SVG unit = 1 mm — head on the left, body/shaft to the right.
 * width/height attributes carry the true physical part size so CSS
 * max-height / max-width produce proportionally correct 1:1 scale icons.
 */
export function getFastenerSVGLabel(part) {
  if (!part?.headType) return ''

  const nomD = d(part.thread)
  const ht   = part.headType
  const len  = part.length || 10
  let W, H, content

  if (SCREW_TYPES.has(ht)) {
    const dims = screwDims(ht, nomD)
    const hH   = dims.headH   // head length (horizontal mm)
    const hW   = dims.headW   // head cross-section (vertical mm)
    const sD   = nomD         // shaft diameter
    W = hH + len
    H = hW
    const cy = H / 2

    let head
    if (ht === 'socket' || ht === 'low-socket') {
      const rW = hH * 0.45, rH = hW * 0.50
      head =
        `<rect x="0" y="0" width="${f(hH)}" height="${f(hW)}" fill="#111"/>` +
        `<rect x="0" y="${f(cy - rH / 2)}" width="${f(rW)}" height="${f(rH)}" fill="#aaa"/>`
    } else if (ht === 'button') {
      const cornerR = Math.min(hH * 0.12, hW * 0.12)
      const p =
        `M ${f(hH)},${f(cornerR)} ` +
        `L ${f(hH)},${f(hW - cornerR)} ` +
        `Q ${f(hH)},${f(hW)} ${f(hH - cornerR)},${f(hW)} ` +
        `Q ${f(hH * 0.3)},${f(hW)} 0,${f(cy)} ` +
        `Q ${f(hH * 0.3)},0 ${f(hH - cornerR)},0 ` +
        `Q ${f(hH)},0 ${f(hH)},${f(cornerR)} Z`
      head = `<path d="${p}" fill="#111"/>`
    } else if (ht === 'countersunk') {
      head = `<path d="M 0,0 L 0,${f(hW)} L ${f(hH)},${f(cy + sD / 2)} L ${f(hH)},${f(cy - sD / 2)} Z" fill="#111"/>`
    } else {
      head = `<rect x="0" y="0" width="${f(hH)}" height="${f(hW)}" fill="#111"/>`
    }

    const shaft = `<rect x="${f(hH)}" y="${f(cy - sD / 2)}" width="${f(len)}" height="${f(sD)}" fill="#111"/>`
    // Mirror horizontally so shaft points left, head on right
    content = `<g transform="scale(-1,1) translate(-${f(W)},0)">${head + shaft}</g>`

  } else if (ht === 'nut') {
    const sq    = isSquareNut(part)
    const bW    = sq ? nomD * 2.5  : nomD * 1.75
    const bH    = sq ? nomD * 0.60 : nomD * 0.80
    const holeW = nomD * 1.05
    const nyloc = !sq && (part.description?.toLowerCase().includes('nyloc') || part.standard?.includes('985'))
    W = bW
    H = bH * (nyloc ? 1.50 : 1.0)
    const cy = bH / 2
    if (sq) {
      // Square nut: plain rectangle, no chamfers
      content =
        `<rect x="0" y="0" width="${f(bW)}" height="${f(bH)}" fill="#111"/>` +
        `<rect x="${f(bW / 2 - holeW / 2)}" y="0" width="${f(holeW)}" height="${f(bH)}" fill="#aaa"/>`
    } else {
      const ch = Math.min(bW, bH) * 0.07
      const bodyPath =
        `M ${f(ch)},0 L ${f(bW - ch)},0 L ${f(bW)},${f(ch)} ` +
        `L ${f(bW)},${f(bH - ch)} L ${f(bW - ch)},${f(bH)} ` +
        `L ${f(ch)},${f(bH)} L 0,${f(bH - ch)} L 0,${f(ch)} Z`
      content =
        `<path d="${bodyPath}" fill="#111"/>` +
        `<rect x="${f(bW / 2 - holeW / 2)}" y="0" width="${f(holeW)}" height="${f(bH)}" fill="#aaa"/>`
      if (nyloc) {
        const insH = bH * 0.50
        content +=
          `<rect x="0" y="${f(bH)}" width="${f(bW)}" height="${f(insH)}" fill="#888"/>` +
          `<rect x="${f(bW / 2 - holeW / 2)}" y="${f(bH)}" width="${f(holeW)}" height="${f(insH * 0.55)}" fill="#ccc"/>` +
          `<line x1="0" y1="${f(bH)}" x2="${f(bW)}" y2="${f(bH)}" stroke="white" stroke-width="0.3"/>`
      }
    }

  } else if (ht === 'washer') {
    const { outerD: oD, innerD: iD, thick: th } = washerDims(part)
    W = th
    H = oD
    const arm = (oD - iD) / 2
    content =
      `<rect x="0" y="0" width="${f(th)}" height="${f(arm)}" fill="#111"/>` +
      `<rect x="0" y="${f(H - arm)}" width="${f(th)}" height="${f(arm)}" fill="#111"/>`

  } else if (ht === 'standoff') {
    const mf      = isMFStandoff(part)
    const bW      = nomD * 1.75
    const hD      = nomD * 1.05
    const hLen    = nomD * 1.2
    const studLen = mf ? nomD * 1.2 : 0
    W = len + studLen
    H = bW
    const cy = H / 2
    if (mf) {
      // Hex body (shifted right by studLen), female hole on right end, male stud on left
      content =
        `<rect x="${f(studLen)}" y="0" width="${f(len)}" height="${f(bW)}" fill="#111"/>` +
        `<rect x="${f(studLen + len - hLen)}" y="${f(cy - hD / 2)}" width="${f(hLen)}" height="${f(hD)}" fill="#aaa"/>` +
        `<rect x="0" y="${f(cy - hD / 2)}" width="${f(studLen)}" height="${f(hD)}" fill="#111"/>` +
        `<line x1="${f(studLen)}" y1="${f(cy)}" x2="${f(studLen + len - hLen)}" y2="${f(cy)}" stroke="white" stroke-width="0.3" stroke-dasharray="1,1"/>`
    } else {
      content =
        `<rect x="0" y="0" width="${f(len)}" height="${f(bW)}" fill="#111"/>` +
        `<rect x="0" y="${f(cy - hD / 2)}" width="${f(hLen)}" height="${f(hD)}" fill="#aaa"/>` +
        `<rect x="${f(len - hLen)}" y="${f(cy - hD / 2)}" width="${f(hLen)}" height="${f(hD)}" fill="#aaa"/>` +
        `<line x1="${f(hLen)}" y1="${f(cy)}" x2="${f(len - hLen)}" y2="${f(cy)}" stroke="white" stroke-width="0.3" stroke-dasharray="1,1"/>`
    }

  } else if (ht === 'insert') {
    // Horizontal cylinder with knurl bands + thread bore on right end
    const bodyH_mm = nomD * 1.8
    const holeD    = nomD * 0.85
    const holeLen  = len * 0.55
    W = len
    H = bodyH_mm
    const cy = H / 2
    const nBands = Math.max(3, Math.round(len / (nomD * 0.9)))
    let bands = ''
    for (let i = 1; i < nBands; i++) {
      const x = (W / nBands) * i
      bands += `<line x1="${f(x)}" y1="0" x2="${f(x)}" y2="${f(H)}" stroke="#555" stroke-width="0.5"/>`
    }
    content =
      `<rect x="0" y="0" width="${f(W)}" height="${f(H)}" fill="#111"/>` +
      bands +
      `<rect x="${f(W - holeLen)}" y="${f(cy - holeD / 2)}" width="${f(holeLen)}" height="${f(holeD)}" fill="#aaa"/>`

  } else if (ht === 'set-screw') {
    // Headless cylinder — same OD as thread, hex socket on right end
    const sockLen = nomD * 0.6
    const sockH   = nomD * 0.52
    W = len
    H = nomD
    const cy = H / 2
    content =
      `<rect x="0" y="0" width="${f(W)}" height="${f(H)}" fill="#111"/>` +
      `<rect x="${f(W - sockLen)}" y="${f(cy - sockH / 2)}" width="${f(sockLen)}" height="${f(sockH)}" fill="#aaa"/>`

  } else if (ht === 'pin') {
    W = len
    H = nomD
    const cr = Math.min(H / 2, H * 0.15)
    content = `<rect x="0" y="0" width="${f(W)}" height="${f(H)}" rx="${f(cr)}" fill="#111"/>`

  } else if (ht === 'press-nut') {
    // Side profile: wide flange left + narrower body right, bore through centre
    const flangeW_mm = nomD * 1.85
    const bodyW_mm   = nomD * 1.40
    const flangeH_mm = nomD * 0.50
    const bodyH_mm   = nomD * 0.55
    const holeW_mm   = nomD * 0.85
    W = flangeH_mm + bodyH_mm
    H = flangeW_mm
    const cy = H / 2
    // Horizontal layout: flange on left (taller cross-section), body on right (narrower)
    const bOff = (H - bodyW_mm) / 2
    content =
      `<rect x="0" y="0" width="${f(flangeH_mm)}" height="${f(flangeW_mm)}" fill="#111"/>` +
      `<rect x="${f(flangeH_mm)}" y="${f(bOff)}" width="${f(bodyH_mm)}" height="${f(bodyW_mm)}" fill="#111"/>` +
      `<rect x="0" y="${f(cy - holeW_mm / 2)}" width="${f(W)}" height="${f(holeW_mm)}" fill="#aaa"/>`

  } else {
    const dims = screwDims('socket', nomD)
    W = dims.headH + len
    H = dims.headW
    const cy = H / 2
    const fallbackContent =
      `<rect x="0" y="0" width="${f(dims.headH)}" height="${f(H)}" fill="#111"/>` +
      `<rect x="${f(dims.headH)}" y="${f(cy - nomD / 2)}" width="${f(len)}" height="${f(nomD)}" fill="#111"/>`
    content = `<g transform="scale(-1,1) translate(-${f(W)},0)">${fallbackContent}</g>`
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="0 0 ${f(W)} ${f(H)}" width="${f(W)}mm" height="${f(H)}mm" ` +
    `class="fastener-svg" aria-hidden="true">` +
    content + `</svg>`
  )
}

/**
 * Compact top/drive-view SVG for bin labels (8×8mm square).
 * Shows the fastener from above: drive recess for screws, hex for nuts/standoffs,
 * ring for washers.
 */
export function getFastenerSVGLabelTop(part) {
  if (!part?.headType) return ''
  const S  = 8
  const cx = S / 2, cy = S / 2, r = S / 2 * 0.88
  const content = makeTopView(part, cx, cy, r)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="0 0 ${S} ${S}" width="${S}mm" height="${S}mm" ` +
    `class="fastener-svg" aria-hidden="true">` +
    content + `</svg>`
  )
}

/**
 * Like getFastenerSVGLabel but renders the part at a shortened length and overlays
 * a break mark to indicate the true length is greater.
 *
 * Strategy: render the fastener at `targetLen` using the existing function (so every
 * head shape and body detail is drawn correctly), then inject a white rectangle +
 * break-mark lines into the middle of the shaft/body.  The white fill reliably erases
 * whatever flat rectangular body section sits in the break zone, regardless of head
 * type — no custom geometry needed per head shape.
 *
 * Nuts and washers fall back unchanged (their width is the across-flats dimension,
 * not a length that benefits from shortening).
 */
export function getFastenerSVGLabelReduced(part) {
  if (!part?.headType) return ''
  const ht = part.headType
  if (ht === 'nut' || ht === 'washer' || ht === 'press-nut') return getFastenerSVGLabel(part)

  const nomD = d(part.thread)
  const len  = part.length || 10

  // Short visual length — enough shaft/body on each side of the break to be recognisable
  const targetLen = Math.max(nomD * 3.5, 10)

  // Fall back when the part isn't meaningfully longer than the visual representation
  if (len <= targetLen * 1.25) return getFastenerSVGLabel(part)

  // Render at the shortened length; all head/body geometry is handled automatically
  const shortSvg = getFastenerSVGLabel({ ...part, length: targetLen })
  if (!shortSvg) return ''

  // Extract canvas size from viewBox
  const vb = shortSvg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/)
  if (!vb) return shortSvg
  const svgW = parseFloat(vb[1])
  const svgH = parseFloat(vb[2])

  // Pins are symmetric — centre the break.  Everything else leans toward the tip so
  // the head-side stub shows more detail.
  const breakX = ht === 'pin'
    ? svgW * 0.50 - BREAK_W / 2
    : svgW * 0.40 - BREAK_W / 2

  // Screw shafts are a narrow band centred in a taller SVG (head height drives H).
  // All other types span the full SVG height.
  const isScrewType = SCREW_TYPES.has(ht)
  const yTop = isScrewType ? svgH / 2 - nomD / 2 : 0
  const yBot = isScrewType ? svgH / 2 + nomD / 2 : svgH

  // For full-height bodies (pins, standoffs, set-screws, inserts) the S-curve
  // extensions sit outside the viewBox and get clipped — the ticks above/below
  // are invisible.  Expand the SVG canvas so they are revealed.
  // Screws already have room in the canvas above/below the shaft, so no change needed.
  const h   = yBot - yTop
  const ext = Math.min(h * 0.35, 1.5)   // must match the constant inside breakMark()
  let svg = shortSvg
  if (!isScrewType && ext > 0) {
    const newH = svgH + 2 * ext
    svg = svg
      .replace(/viewBox="0 0 [0-9.]+ [0-9.]+"/, `viewBox="0 ${f(-ext)} ${f(svgW)} ${f(newH)}"`)
      .replace(/height="[0-9.]+mm"/, `height="${f(newH)}mm"`)
  }

  return svg.replace('</svg>', breakMark(breakX, yTop, yBot) + '</svg>')
}

/**
 * Returns a <div class="fastener-icon"> DOM element containing the SVG.
 * Ready to append to the document.
 */
export function makeFastenerSVGEl(part) {
  const div = document.createElement('div')
  div.className = 'fastener-icon'
  div.innerHTML = getFastenerSVG(part)
  return div
}
