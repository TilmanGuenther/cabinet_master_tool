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

export const PART_TYPES = {
  screw,
  nut,
  washer,
  standoff,
  'set-screw': setScrew,
  insert,
  pin,
  'press-nut': pressNut,
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
