/**
 * partSvg.js
 * Assembles B&W SVG silhouette icons from per-part-type drawings.
 *
 * This module owns the canvases and the break-mark overlay; what to draw on
 * them belongs to each part type in src/data/partTypes/. Adding a part type
 * does not require editing this file.
 *
 * Two-panel layout:
 *   Left  panel (0–44):  top/drive view  — looking straight down at the head
 *   Right panel (50–96): side profile    — proportional to real DIN/ISO geometry
 *
 * Usage:
 *   getPartSVG(part)         → SVG string (for innerHTML)
 *   makePartSVGEl(part)      → <div class="fastener-icon"> wrapping the SVG
 */

import { d, f } from './partDims.js'
import {
  makeTopView, makeSideView, mmPerUnit, breakBehaviour, hasSilhouette, labelBody,
} from '../data/partTypes/index.js'

// ── SVG layout constants ──────────────────────────────────────────────────────

const VW = 96   // viewBox width
const VH = 48   // viewBox height
// Left panel: 0–44  (top/drive view)
// Divider at x=47
// Right panel: 50–96  (side profile)
const R_X = 50
const R_W = 46
const R_Y = 1
const R_H = VH - 2

const BREAK_W = 2.2   // mm — width of the break zone

// ── Physical size helpers ─────────────────────────────────────────────────────

// ── Break-mark helper (used by getPartSVGLabelReduced) ───────────────────

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
export function getPartSVG(part) {
  if (!hasSilhouette(part)) return ''

  const topView  = makeTopView(part)
  const sideView = makeSideView(part)
  const divider  = `<line x1="47" y1="3" x2="47" y2="${VH - 3}" stroke="#bbb" stroke-width="0.6"/>`

  // Rotate side panel so fastener lies horizontal (head left, shaft right)
  const sideCX = R_X + R_W / 2   // 73
  const sideCY = R_Y + R_H / 2   // 24
  const rotatedSide = `<g transform="rotate(-90,${sideCX},${sideCY})">${sideView}</g>`

  // Physical dimensions for 1:1-scale label rendering
  const mpu = mmPerUnit(part)
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
export function getPartSVGLabel(part) {
  if (!hasSilhouette(part)) return ''

  const { W, H, content } = labelBody(part)

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
export function getPartSVGLabelTop(part) {
  if (!hasSilhouette(part)) return ''
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
 * Like getPartSVGLabel but renders the part at a shortened length and overlays
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
export function getPartSVGLabelReduced(part) {
  if (!hasSilhouette(part)) return ''
  const brk = breakBehaviour(part)
  if (!brk.reducible) return getPartSVGLabel(part)

  const nomD = d(part.thread)
  const len  = part.length || 10

  // Short visual length — enough shaft/body on each side of the break to be recognisable
  const targetLen = Math.max(nomD * 3.5, 10)

  // Fall back when the part isn't meaningfully longer than the visual representation
  if (len <= targetLen * 1.25) return getPartSVGLabel(part)

  // Render at the shortened length; all head/body geometry is handled automatically
  const shortSvg = getPartSVGLabel({ ...part, length: targetLen })
  if (!shortSvg) return ''

  // Extract canvas size from viewBox
  const vb = shortSvg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/)
  if (!vb) return shortSvg
  const svgW = parseFloat(vb[1])
  const svgH = parseFloat(vb[2])

  // Pins are symmetric — centre the break.  Everything else leans toward the tip so
  // the head-side stub shows more detail.
  const breakX = brk.centred
    ? svgW * 0.50 - BREAK_W / 2
    : svgW * 0.40 - BREAK_W / 2

  // Screw shafts are a narrow band centred in a taller SVG (head height drives H).
  // All other types span the full SVG height.
  const yTop = brk.fullHeight ? 0     : svgH / 2 - nomD / 2
  const yBot = brk.fullHeight ? svgH  : svgH / 2 + nomD / 2

  // For full-height bodies (pins, standoffs, set-screws, inserts) the S-curve
  // extensions sit outside the viewBox and get clipped — the ticks above/below
  // are invisible.  Expand the SVG canvas so they are revealed.
  // Screws already have room in the canvas above/below the shaft, so no change needed.
  const h   = yBot - yTop
  const ext = Math.min(h * 0.35, 1.5)   // must match the constant inside breakMark()
  let svg = shortSvg
  if (brk.fullHeight && ext > 0) {
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
export function makePartSVGEl(part) {
  const div = document.createElement('div')
  div.className = 'fastener-icon'
  div.innerHTML = getPartSVG(part)
  return div
}
