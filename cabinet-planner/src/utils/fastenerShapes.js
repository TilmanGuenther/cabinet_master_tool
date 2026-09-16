/**
 * fastenerShapes.js
 * SVG shape primitives for part silhouettes.
 *
 * This is a toolkit, not a dispatcher: each function draws one shape. Which
 * shape a given part uses is decided by its part type module in
 * src/data/partTypes/, which composes these into its `svg` descriptor.
 */

import { d, f, screwDims, washerDims, isSquareNut, isMFStandoff } from './fastenerDims.js'

// ── SVG layout constants (mirrored from fastenerSvg.js) ───────────────────────

const VH = 48
// Left panel: 0–44  (top/drive view)
export const L_CX = 22
export const L_CY = 24
export const L_R  = 17.5
// Right panel: 50–96  (side profile)
export const R_X = 50
export const R_W = 46
export const R_Y = 1
export const R_H = VH - 2

// ── Path generators ───────────────────────────────────────────────────────────

/** Torx star with rounded inner corners (6 outer tips, 6 rounded valleys). */
function torxPath(cx, cy, r) {
  const inner = r * 0.42
  const n = 6
  const outer = []
  const inn = []
  for (let i = 0; i < n; i++) {
    const aOuter = (i * 2 * Math.PI) / n - Math.PI / 2
    const aInner = aOuter + Math.PI / n
    outer.push({ x: cx + r * Math.cos(aOuter), y: cy + r * Math.sin(aOuter) })
    inn.push({ x: cx + inner * Math.cos(aInner), y: cy + inner * Math.sin(aInner) })
  }

  const t = 0.40  // rounding: 0 = sharp, 1 = fully smooth
  const segs = []
  for (let i = 0; i < n; i++) {
    const o    = outer[i]
    const v    = inn[i]
    const oN   = outer[(i + 1) % n]
    // approach & exit points around the inner corner
    const ex = o.x + (v.x - o.x) * (1 - t)
    const ey = o.y + (v.y - o.y) * (1 - t)
    const xx = v.x + (oN.x - v.x) * t
    const xy = v.y + (oN.y - v.y) * t
    segs.push(
      (i === 0 ? `M ${f(o.x)},${f(o.y)}` : `L ${f(o.x)},${f(o.y)}`),
      `L ${f(ex)},${f(ey)}`,
      `Q ${f(v.x)},${f(v.y)} ${f(xx)},${f(xy)}`
    )
  }
  segs.push('Z')
  return segs.join(' ')
}

/** Regular hexagon, pointy-top by default. */
function hexPath(cx, cy, r, flatTop = false) {
  const offset = flatTop ? 0 : Math.PI / 6
  const pts = []
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI * 2) / 6 + offset
    pts.push(`${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`)
  }
  return `M ${pts.join(' L ')} Z`
}

// ── Top/drive view generators ─────────────────────────────────────────────────

/** Circular head with drive recess (dark gray cut-out, visible on white). */
export function topScrew(cx, cy, r, drive) {
  const body = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#111"/>`
  const dr   = r * 0.60
  let recess = ''
  if (drive === 'Torx') {
    recess = `<path d="${torxPath(cx, cy, dr)}" fill="#aaa"/>`
  } else if (drive === 'Hex' || drive === 'Allen' || drive === 'Hex Socket') {
    recess = `<path d="${hexPath(cx, cy, dr * 0.85)}" fill="#aaa"/>`
  } else if (drive === 'Phillips') {
    const aw = dr * 0.22
    recess =
      `<path d="M${f(cx - aw)},${f(cy - dr)} L${f(cx + aw)},${f(cy - dr)} ` +
      `L${f(cx + aw)},${f(cy - aw)} L${f(cx + dr)},${f(cy - aw)} ` +
      `L${f(cx + dr)},${f(cy + aw)} L${f(cx + aw)},${f(cy + aw)} ` +
      `L${f(cx + aw)},${f(cy + dr)} L${f(cx - aw)},${f(cy + dr)} ` +
      `L${f(cx - aw)},${f(cy + aw)} L${f(cx - dr)},${f(cy + aw)} ` +
      `L${f(cx - dr)},${f(cy - aw)} L${f(cx - aw)},${f(cy - aw)} Z" fill="#aaa"/>`
  } else if (drive === 'Slot') {
    const sw = dr * 0.18
    recess = `<rect x="${f(cx - sw / 2)}" y="${f(cy - dr)}" width="${f(sw)}" height="${f(dr * 2)}" fill="#aaa"/>`
  }
  return body + recess
}

/** Hex outline with central through-hole. Used for nuts and standoffs. */
export function topHex(cx, cy, r, holeR) {
  return (
    `<path d="${hexPath(cx, cy, r)}" fill="#111"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(holeR)}" fill="#aaa"/>`
  )
}

/** Annulus (ring). Used for washers. Hole ratio from physical dims; white centre = through hole. */
export function topWasher(cx, cy, r, part) {
  const dims = washerDims(part)
  const holeRatio = dims.innerD / dims.outerD
  return (
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#111"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * holeRatio)}" fill="white"/>`
  )
}

/** Plain filled circle. Used for dowel/spring pins. */
export function topPin(cx, cy, r) {
  return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#111"/>`
}

/** Threaded heat-set insert: knurled outer ring + central bore. */
export function topInsert(cx, cy, r) {
  const holeR  = r * 0.38
  const kInner = r * 0.62
  const kOuter = r * 0.93
  const n = 12
  let knurls = ''
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n
    knurls +=
      `<line x1="${f(cx + kInner * Math.cos(a))}" y1="${f(cy + kInner * Math.sin(a))}" ` +
      `x2="${f(cx + kOuter * Math.cos(a))}" y2="${f(cy + kOuter * Math.sin(a))}" ` +
      `stroke="#555" stroke-width="1.2"/>`
  }
  return (
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#111"/>` +
    knurls +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(holeR)}" fill="#aaa"/>`
  )
}

/** Square nut: square outline with central through-hole. */
export function topSquareNut(cx, cy, r, holeR) {
  const s = r * 0.94
  return (
    `<rect x="${f(cx - s)}" y="${f(cy - s)}" width="${f(s * 2)}" height="${f(s * 2)}" fill="#111"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(holeR)}" fill="#aaa"/>`
  )
}

/**
 * Top view of a press-in nut (KF2 style): outer knurled ring + inner step + bore.
 * Outer ring = flange (d3), inner step = body (d2), centre = threaded bore.
 */
export function topPressNut(cx, cy, r) {
  const stepR  = r * 0.72   // proportional to d2/d3 ratio (~4.68/5.56 ≈ 0.84 → visually ~0.72)
  const holeR  = r * 0.38
  const kInner = stepR
  const kOuter = r * 0.94
  const n = 16
  let knurls = ''
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n
    knurls +=
      `<line x1="${f(cx + kInner * Math.cos(a))}" y1="${f(cy + kInner * Math.sin(a))}" ` +
      `x2="${f(cx + kOuter * Math.cos(a))}" y2="${f(cy + kOuter * Math.sin(a))}" ` +
      `stroke="#555" stroke-width="1.0"/>`
  }
  return (
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#111"/>` +
    knurls +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(stepR)}" fill="#111"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(holeR)}" fill="#aaa"/>`
  )
}

// ── Side profile generators ───────────────────────────────────────────────────

/** Screw head shape helper — returns SVG path/rect string for the head only. */
function headEl(headType, cx, topY, headW, headH, shaftW) {
  switch (headType) {
    case 'socket':
    case 'low-socket': {
      // Cylindrical head with socket recess at top
      const recessW = headW * 0.50
      const recessH = headH * 0.45
      return (
        `<rect x="${f(cx - headW / 2)}" y="${f(topY)}" width="${f(headW)}" height="${f(headH)}" fill="#111"/>` +
        `<rect x="${f(cx - recessW / 2)}" y="${f(topY)}" width="${f(recessW)}" height="${f(recessH)}" fill="#aaa"/>`
      )
    }
    case 'button': {
      // Low dome with rounded base corners
      const cornerR = Math.min(headW * 0.06, headH * 0.18)
      const p =
        `M ${f(cx - headW / 2 + cornerR)},${f(topY + headH)} ` +
        `Q ${f(cx - headW / 2)},${f(topY + headH)} ${f(cx - headW / 2)},${f(topY + headH - cornerR)} ` +
        `Q ${f(cx - headW / 2)},${f(topY)} ${f(cx)},${f(topY)} ` +
        `Q ${f(cx + headW / 2)},${f(topY)} ${f(cx + headW / 2)},${f(topY + headH - cornerR)} ` +
        `Q ${f(cx + headW / 2)},${f(topY + headH)} ${f(cx + headW / 2 - cornerR)},${f(topY + headH)} Z`
      return `<path d="${p}" fill="#111"/>`
    }
    case 'countersunk': {
      // Flat-head taper: wide at top, narrows to shaft at bottom
      const p = `M ${f(cx - headW / 2)},${f(topY)} ` +
                `L ${f(cx + headW / 2)},${f(topY)} ` +
                `L ${f(cx + shaftW / 2)},${f(topY + headH)} ` +
                `L ${f(cx - shaftW / 2)},${f(topY + headH)} Z`
      return `<path d="${p}" fill="#111"/>`
    }
    default:
      return `<rect x="${f(cx - headW / 2)}" y="${f(topY)}" width="${f(headW)}" height="${f(headH)}" fill="#111"/>`
  }
}

export function sideScrew(part, rx, ry, rw, rh) {
  const nomD  = d(part.thread)
  const len   = part.length || 10
  const dims  = screwDims(part.headType, nomD)
  const shaftW_mm = nomD

  // Scale to fit panel with some margin
  const scale = Math.min((rh * 0.88) / (dims.headH + len), (rw * 0.70) / dims.headW)

  const headH = dims.headH * scale
  const headW = dims.headW * scale
  const shaftH = len * scale
  const shaftW = shaftW_mm * scale

  const cx    = rx + rw / 2
  const totalH = headH + shaftH
  const topY   = ry + (rh - totalH) / 2

  const head  = headEl(part.headType, cx, topY, headW, headH, shaftW)
  const shaft =
    `<rect x="${f(cx - shaftW / 2)}" y="${f(topY + headH)}" ` +
    `width="${f(shaftW)}" height="${f(shaftH)}" fill="#111"/>`

  return head + shaft
}

export function sideNut(part, rx, ry, rw, rh) {
  const nomD  = d(part.thread)
  const square = isSquareNut(part)

  // DIN 562 square nut: wider across flats, thinner body, no chamfers
  const bodyW_mm = square ? nomD * 2.5  : nomD * 1.75
  const bodyH_mm = square ? nomD * 0.60 : nomD * 0.80
  const holeW_mm = nomD * 1.05

  const nyloc = !square && (
    part.description?.toLowerCase().includes('nyloc') ||
    part.standard?.includes('985')
  )

  const totalH_mm = bodyH_mm * (nyloc ? 1.50 : 1.0)
  const scale = Math.min((rh * 0.72) / totalH_mm, (rw * 0.72) / bodyW_mm)

  const bodyW = bodyW_mm * scale
  const bodyH = bodyH_mm * scale
  const holeW = holeW_mm * scale

  const cx   = rx + rw / 2
  const topY = ry + (rh - totalH_mm * scale) / 2

  if (square) {
    // Square nut: plain rectangle, no chamfers
    return (
      `<rect x="${f(cx - bodyW / 2)}" y="${f(topY)}" width="${f(bodyW)}" height="${f(bodyH)}" fill="#111"/>` +
      `<rect x="${f(cx - holeW / 2)}" y="${f(topY)}" width="${f(holeW)}" height="${f(bodyH)}" fill="#aaa"/>`
    )
  }

  // Hex nut: body with chamfer at corners
  const ch = bodyW * 0.07
  const bodyPath =
    `M ${f(cx - bodyW / 2 + ch)},${f(topY)} ` +
    `L ${f(cx + bodyW / 2 - ch)},${f(topY)} ` +
    `L ${f(cx + bodyW / 2)},${f(topY + ch)} ` +
    `L ${f(cx + bodyW / 2)},${f(topY + bodyH - ch)} ` +
    `L ${f(cx + bodyW / 2 - ch)},${f(topY + bodyH)} ` +
    `L ${f(cx - bodyW / 2 + ch)},${f(topY + bodyH)} ` +
    `L ${f(cx - bodyW / 2)},${f(topY + bodyH - ch)} ` +
    `L ${f(cx - bodyW / 2)},${f(topY + ch)} Z`

  let out =
    `<path d="${bodyPath}" fill="#111"/>` +
    `<rect x="${f(cx - holeW / 2)}" y="${f(topY)}" ` +
    `width="${f(holeW)}" height="${f(bodyH)}" fill="#aaa"/>`

  if (nyloc) {
    const insertH   = bodyH * 0.50
    const insertY   = topY + bodyH
    const partHoleH = insertH * 0.55
    out +=
      `<rect x="${f(cx - bodyW / 2)}" y="${f(insertY)}" ` +
      `width="${f(bodyW)}" height="${f(insertH)}" fill="#888"/>` +
      `<rect x="${f(cx - holeW / 2)}" y="${f(insertY)}" ` +
      `width="${f(holeW)}" height="${f(partHoleH)}" fill="#ccc"/>` +
      `<line x1="${f(cx - bodyW / 2)}" y1="${f(insertY)}" ` +
      `x2="${f(cx + bodyW / 2)}" y2="${f(insertY)}" ` +
      `stroke="white" stroke-width="0.8"/>`
  }

  return out
}

export function sideWasher(part, rx, ry, rw, rh) {
  const { outerD, innerD, thick } = washerDims(part)

  const scale  = Math.min((rh * 0.55) / thick, (rw * 0.82) / outerD)
  const outerW = outerD * scale
  const innerW = innerD * scale
  const th     = Math.max(thick * scale, 3.5)  // minimum 3.5 px to stay visible

  const cx   = rx + rw / 2
  const topY = ry + (rh - th) / 2
  const armW = (outerW - innerW) / 2

  return (
    `<rect x="${f(cx - outerW / 2)}" y="${f(topY)}" width="${f(armW)}" height="${f(th)}" fill="#111"/>` +
    `<rect x="${f(cx + innerW / 2)}" y="${f(topY)}" width="${f(armW)}" height="${f(th)}" fill="#111"/>`
  )
}

export function sideStandoff(part, rx, ry, rw, rh) {
  const nomD     = d(part.thread)
  const len      = part.length || 12
  const mf       = isMFStandoff(part)
  const bodyW_mm = nomD * 1.75
  const holeW_mm = nomD * 1.05
  const holeH_mm = nomD * 1.2
  // Male stud protrudes below the hex body on M/F variants
  const studH_mm = mf ? nomD * 1.2 : 0

  const scale = Math.min((rh * 0.88) / (len + studH_mm), (rw * 0.72) / bodyW_mm)
  const bodyH = len * scale
  const bodyW = bodyW_mm * scale
  const holeW = holeW_mm * scale
  const holeH = holeH_mm * scale
  const studH = studH_mm * scale
  const studW = holeW  // stud OD ≈ thread OD

  const cx   = rx + rw / 2
  const topY = ry + (rh - (bodyH + studH)) / 2

  let out =
    `<rect x="${f(cx - bodyW / 2)}" y="${f(topY)}" width="${f(bodyW)}" height="${f(bodyH)}" fill="#111"/>` +
    // Female (internal) thread hole at top
    `<rect x="${f(cx - holeW / 2)}" y="${f(topY)}" width="${f(holeW)}" height="${f(holeH)}" fill="#aaa"/>`

  if (mf) {
    // Male stud protruding from bottom; body below the blind hole is solid (no center line)
    out +=
      `<rect x="${f(cx - studW / 2)}" y="${f(topY + bodyH)}" width="${f(studW)}" height="${f(studH)}" fill="#111"/>`
  } else {
    // F/F: second thread hole at bottom
    out +=
      `<rect x="${f(cx - holeW / 2)}" y="${f(topY + bodyH - holeH)}" width="${f(holeW)}" height="${f(holeH)}" fill="#aaa"/>` +
      `<line x1="${f(cx)}" y1="${f(topY + holeH)}" x2="${f(cx)}" y2="${f(topY + bodyH - holeH)}" ` +
      `stroke="white" stroke-width="0.6" stroke-dasharray="2,2"/>`
  }

  return out
}

export function sidePin(part, rx, ry, rw, rh) {
  const nomD  = d(part.thread)
  const len   = part.length || 10
  const scale = Math.min((rh * 0.88) / len, (rw * 0.55) / nomD)
  const bodyH = len * scale
  const bodyW = nomD * scale

  const cx   = rx + rw / 2
  const topY = ry + (rh - bodyH) / 2
  const cr   = Math.min(bodyW / 2, bodyW * 0.15)

  return `<rect x="${f(cx - bodyW / 2)}" y="${f(topY)}" width="${f(bodyW)}" height="${f(bodyH)}" rx="${f(cr)}" fill="#111"/>`
}

/** Side profile of a heat-set threaded insert: knurled cylinder + bore. */
export function sideInsert(part, rx, ry, rw, rh) {
  const nomD     = d(part.thread)
  const len      = part.length || nomD * 2.5
  const bodyW_mm = nomD * 1.8
  const holeW_mm = nomD * 0.85
  const holeH_mm = len  // through-hole: bore runs the full length of the insert

  const scale = Math.min((rh * 0.88) / len, (rw * 0.72) / bodyW_mm)
  const bodyH = len * scale
  const bodyW = bodyW_mm * scale
  const holeW = holeW_mm * scale
  const holeH = holeH_mm * scale

  const cx   = rx + rw / 2
  const topY = ry + (rh - bodyH) / 2

  const nKnurls = 5
  let knurls = ''
  for (let i = 1; i <= nKnurls; i++) {
    const y    = topY + (bodyH / (nKnurls + 1)) * i
    const kLen = bodyW * 0.14
    knurls +=
      `<line x1="${f(cx - bodyW / 2)}" y1="${f(y)}" ` +
      `x2="${f(cx - bodyW / 2 + kLen)}" y2="${f(y)}" stroke="#555" stroke-width="0.8"/>` +
      `<line x1="${f(cx + bodyW / 2 - kLen)}" y1="${f(y)}" ` +
      `x2="${f(cx + bodyW / 2)}" y2="${f(y)}" stroke="#555" stroke-width="0.8"/>`
  }

  return (
    `<rect x="${f(cx - bodyW / 2)}" y="${f(topY)}" width="${f(bodyW)}" height="${f(bodyH)}" fill="#111"/>` +
    knurls +
    `<rect x="${f(cx - holeW / 2)}" y="${f(topY)}" width="${f(holeW)}" height="${f(holeH)}" fill="#aaa"/>`
  )
}

/**
 * Side profile of a press-in nut: wide flange on top (sits above the panel) +
 * narrower knurled body below (presses into the panel) + central threaded bore.
 * Proportions approximate PEM KF2 geometry.
 */
export function sidePressNut(part, rx, ry, rw, rh) {
  const nomD       = d(part.thread)
  const flangeW_mm = nomD * 1.85   // d3 ≈ 1.85×nomD
  const bodyW_mm   = nomD * 1.40   // Bohr-Ø ≈ 1.40×nomD
  const flangeH_mm = nomD * 0.50   // h max ≈ 0.50×nomD
  const bodyH_mm   = nomD * 0.55   // m ≈ 0.50–0.55×nomD
  const holeW_mm   = nomD * 0.85   // thread bore
  const totalH_mm  = flangeH_mm + bodyH_mm

  const scale  = Math.min((rh * 0.72) / totalH_mm, (rw * 0.82) / flangeW_mm)
  const flangeW = flangeW_mm * scale
  const bodyW   = bodyW_mm   * scale
  const flangeH = flangeH_mm * scale
  const bodyH   = bodyH_mm   * scale
  const holeW   = holeW_mm   * scale

  const cx   = rx + rw / 2
  const topY = ry + (rh - totalH_mm * scale) / 2

  // Knurl ticks on the sides of the pressed-in body
  const nKnurls = 3
  const tickLen = (flangeW - bodyW) / 2 * 0.55
  let knurls = ''
  for (let i = 1; i <= nKnurls; i++) {
    const y = topY + flangeH + (bodyH / (nKnurls + 1)) * i
    knurls +=
      `<line x1="${f(cx - bodyW / 2)}" y1="${f(y)}" ` +
      `x2="${f(cx - bodyW / 2 - tickLen)}" y2="${f(y)}" stroke="#555" stroke-width="0.8"/>` +
      `<line x1="${f(cx + bodyW / 2)}" y1="${f(y)}" ` +
      `x2="${f(cx + bodyW / 2 + tickLen)}" y2="${f(y)}" stroke="#555" stroke-width="0.8"/>`
  }

  return (
    // Wide flange (sits proud of panel)
    `<rect x="${f(cx - flangeW / 2)}" y="${f(topY)}" width="${f(flangeW)}" height="${f(flangeH)}" fill="#111"/>` +
    // Narrower body (presses into panel hole)
    `<rect x="${f(cx - bodyW / 2)}" y="${f(topY + flangeH)}" width="${f(bodyW)}" height="${f(bodyH)}" fill="#111"/>` +
    knurls +
    // Thread bore through full height
    `<rect x="${f(cx - holeW / 2)}" y="${f(topY)}" width="${f(holeW)}" height="${f(flangeH + bodyH)}" fill="#aaa"/>`
  )
}

/** Side profile of a set screw: headless cylinder with hex-socket recess at top. */
export function sideSetScrew(part, rx, ry, rw, rh) {
  const nomD     = d(part.thread)
  const len      = part.length || 8
  const bodyW_mm = nomD
  const sockW_mm = nomD * 0.52
  const sockH_mm = nomD * 0.6

  const scale = Math.min((rh * 0.88) / len, (rw * 0.55) / bodyW_mm)
  const bodyH = len * scale
  const bodyW = bodyW_mm * scale
  const sockW = sockW_mm * scale
  const sockH = sockH_mm * scale

  const cx   = rx + rw / 2
  const topY = ry + (rh - bodyH) / 2

  return (
    `<rect x="${f(cx - bodyW / 2)}" y="${f(topY)}" width="${f(bodyW)}" height="${f(bodyH)}" fill="#111"/>` +
    `<rect x="${f(cx - sockW / 2)}" y="${f(topY)}" width="${f(sockW)}" height="${f(sockH)}" fill="#aaa"/>`
  )
}
