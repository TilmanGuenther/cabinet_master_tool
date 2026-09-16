/**
 * Part type registry.
 *
 * A part type answers *what a part is*: which head geometries it comes in, how
 * it is described in the UI, how densely it packs in a bin, and (from Phase 1.4)
 * how it is drawn. A catalog answers *who sells it*; the two are independent
 * extension points. See doc/CATALOG_PLUGIN_PLAN.md.
 *
 * ---
 * To add a part type:
 *
 *  1. Create a module in this directory exporting a default object with:
 *
 *       id            Stable key. Stored in configs as `part.partType`, so once
 *                     published it must not change.
 *       label         Name shown in the part assigner's Type dropdown.
 *       headTypes     Head geometries this type covers. For types with a single
 *                     geometry (a nut, an o-ring) this is just [id].
 *       headLabels    headType -> human label, used in descriptions.
 *       shortLabel    (part) -> compact one-line text for bin labels.
 *       volumeMM3     (part) -> effective packed volume per piece in mm3,
 *                     including a random-packing penalty. Drives every
 *                     order-list quantity, so document your packing factor.
 *
 *     Optional:
 *       lengthIndependent  true when overall size is set by the thread rather
 *                          than a length field (nuts, washers). Such types are
 *                          looked up in the empirical density table first.
 *       describe           (entry, variantLabel) -> full catalog description.
 *                          Defaults to describePart() below, which suits any
 *                          thread-and-length shaped part.
 *       svg                How the part is drawn. Omit it entirely and the part
 *                          simply has no silhouette: labels fall back to text,
 *                          which is a perfectly good option for a new type.
 *                            layout          'top-first' or 'side-first' -- which
 *                                            view wins in a one-cell label
 *                            top(part,cx,cy,r)   top/drive view
 *                            side(part)          side profile for the two-panel icon
 *                            labelBody(part)     compact label drawing, returning
 *                                                {W, H, content} in mm
 *                            mmPerUnit(part)     mm per SVG unit, so labels print 1:1
 *                            reducible       may be drawn shortened with a break
 *                                            mark when the part is long
 *                            breakCentred    break in the middle (symmetric parts)
 *                            breakFullHeight break spans the whole canvas height
 *                          Compose the drawings from the primitives in
 *                          utils/partShapes.js, or add new ones there.
 *
 *  2. Register it in PART_TYPES below.
 *  3. Add its vocabulary to src/data/catalogs/schema.js so catalogs carrying it
 *     validate, and run `npm run validate`.
 *  4. Run `npm run test:golden` - it must still pass. If your change is meant
 *     to alter existing output, update the snapshot and review the diff.
 * ---
 */

import screw     from './screw.js'
import nut       from './nut.js'
import washer    from './washer.js'
import standoff  from './standoff.js'
import setScrew  from './setScrew.js'
import insert    from './insert.js'
import pin       from './pin.js'
import pressNut  from './pressNut.js'

// Non-fastener types. They declare no thread, head or length, and nothing
// outside their own module knows that.
import oring     from './oring.js'
import spring    from './spring.js'
import spacer    from './spacer.js'

import {
  topScrew, sideScrew, L_CX, L_CY, L_R, R_X, R_Y, R_W, R_H,
} from '../../utils/partShapes.js'
import { d, f, screwDims } from '../../utils/partDims.js'

export const PART_TYPES = {
  screw,
  nut,
  washer,
  standoff,
  'set-screw': setScrew,
  insert,
  pin,
  'press-nut': pressNut,

  'o-ring': oring,
  spring,
  spacer,
}

/** Used when a part carries no type information at all. */
export const DEFAULT_PART_TYPE = 'screw'

/** @returns {object|null} the type spec, or null if the id is unknown. */
export function getPartType(id) {
  return PART_TYPES[id] ?? null
}

/**
 * Which part type owns a given head geometry.
 * @returns {string|null} the part type id, or null when no type claims it.
 */
export function typeForHeadType(headType) {
  for (const [id, type] of Object.entries(PART_TYPES)) {
    if (type.headTypes.includes(headType)) return id
  }
  return null
}

/**
 * Resolve a part record or catalog entry to its type spec.
 *
 * Prefers the stored `partType`, falling back to inference from `headType` so
 * that configs written before part types were stored keep working, and finally
 * to the default so callers never have to null-check.
 */
export function resolvePartType(part) {
  return getPartType(part?.partType)
      ?? getPartType(typeForHeadType(part?.headType))
      ?? PART_TYPES[DEFAULT_PART_TYPE]
}

/** Human label for a head geometry, e.g. 'low-socket' -> 'Low Socket Head'. */
export function headLabel(headType) {
  const type = getPartType(typeForHeadType(headType))
  return type?.headLabels?.[headType]
}

/**
 * Full catalog description: "M3 x8 Socket Head Hex Steel 8.8".
 *
 * Generic across every built-in type, so types only override it when their
 * dimensions do not fit the thread-and-length shape.
 *
 * @param {object} entry         catalog entry or part record
 * @param {string} [variantLabel] label of the resolved variant, which replaces
 *                                the head label when the part has sub-kinds
 */
export function describePart(entry, variantLabel) {
  const type = resolvePartType(entry)
  if (type.describe) return type.describe(entry, variantLabel)

  const parts = []
  if (entry.thread)         parts.push(entry.thread)
  if (entry.length != null) parts.push(`×${entry.length}`)

  const head = variantLabel || type.headLabels?.[entry.headType]
  if (head)                 parts.push(head)

  if (entry.drive)          parts.push(entry.drive)
  if (entry.material)       parts.push(entry.material)
  if (entry.materialGrade)  parts.push(entry.materialGrade)
  return parts.join(' ')
}

/** Compact one-line label text for a part. */
export function shortLabel(part) {
  return resolvePartType(part).shortLabel(part)
}

// ── Silhouette dispatch ───────────────────────────────────────────────────────
// Each part type composes shape primitives from utils/partShapes.js into an
// `svg` descriptor. A type with `svg: null` simply has no drawing, and callers
// degrade to text.

/**
 * Silhouette used when no part type claims a head geometry -- a hand-edited
 * config with an unrecognised `headType`, for instance. Draws a plain
 * cylindrical-head screw so something sensible still appears on the label.
 */
const GENERIC_SVG = {
  layout: 'side-first',
  top:  (part, cx, cy, r) => topScrew(cx, cy, r, part.drive),
  side: part => sideScrew(part, R_X, R_Y, R_W, R_H),
  reducible: true,
  breakCentred: false,
  breakFullHeight: true,
  mmPerUnit(part) {
    const dims = screwDims('socket', d(part.thread))
    const scale = Math.min(
      (R_H * 0.88) / (dims.headH + (part.length || 10)),
      (R_W * 0.70) / dims.headW,
    )
    return 1 / scale
  },
  labelBody(part) {
    const nomD = d(part.thread)
    const len  = part.length || 10
    let W, H, content
        const dims = screwDims('socket', nomD)
        W = dims.headH + len
        H = dims.headW
        const cy = H / 2
        const fallbackContent =
          `<rect x="0" y="0" width="${f(dims.headH)}" height="${f(H)}" fill="#111"/>` +
          `<rect x="${f(dims.headH)}" y="${f(cy - nomD / 2)}" width="${f(len)}" height="${f(nomD)}" fill="#111"/>`
        content = `<g transform="scale(-1,1) translate(-${f(W)},0)">${fallbackContent}</g>`
    return { W, H, content }
  },
}

/**
 * The svg descriptor to draw `part` with.
 *
 * Dispatches on which type actually claims the head geometry rather than on
 * resolvePartType(), so an unrecognised head falls to GENERIC_SVG instead of
 * being drawn as whatever the default type happens to be.
 */
function svgFor(part) {
  const claimed = typeForHeadType(part?.headType)
  return claimed ? PART_TYPES[claimed].svg : GENERIC_SVG
}

/** Does this part have a silhouette at all? */
export function hasSilhouette(part) {
  return Boolean(part?.headType && svgFor(part))
}

/** Which of the two label panels leads: 'top-first' or 'side-first'. */
export function silhouetteLayout(part) {
  return svgFor(part).layout ?? 'side-first'
}

/** Top/drive view, looking straight down at the part. */
export function makeTopView(part, cx = L_CX, cy = L_CY, r = L_R) {
  return svgFor(part).top(part, cx, cy, r)
}

/** Side profile, proportional to real geometry. */
export function makeSideView(part) {
  return svgFor(part).side(part)
}

/**
 * Millimetres per SVG unit for the two-panel icon, so labels can be rendered at
 * 1:1 physical scale.
 */
export function mmPerUnit(part) {
  return svgFor(part).mmPerUnit(part)
}

/**
 * How this type behaves when drawn at a shortened length with a break mark.
 * `reducible: false` means the part has no length worth shortening.
 */
export function breakBehaviour(part) {
  const svg = svgFor(part)
  return {
    reducible:  svg?.reducible ?? false,
    centred:    svg?.breakCentred ?? false,
    fullHeight: svg?.breakFullHeight ?? false,
  }
}

/**
 * Compact horizontal label silhouette.
 * @returns {{W: number, H: number, content: string}} canvas size in mm and SVG body
 */
export function labelBody(part) {
  return svgFor(part).labelBody(part)
}
