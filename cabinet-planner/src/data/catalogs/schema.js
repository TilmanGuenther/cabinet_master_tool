/**
 * Catalog schema: vocabularies and validation.
 *
 * This is the single source of truth for what a catalog entry may contain.
 * `tools/validate-catalogs.mjs` runs `validateCatalog()` over every catalog in
 * CI, so a contributor gets a precise error instead of a silently-wrong
 * silhouette or a mispriced order line.
 *
 * See doc/CATALOG_SCHEMA.md for the contributor-facing field reference and
 * doc/CATALOG_PLUGIN_PLAN.md for how this fits the wider plan.
 *
 * ---
 * TRANSITIONAL (Phase 0 of the catalog plan):
 *
 * PART_TYPE_SPECS below duplicates knowledge that is currently spread across
 * `views/drawerMap/dmConstants.js`, `data/densities.js` and
 * `utils/partShapes.js`. Phase 1 introduces `src/data/partTypes/` as one
 * module per part type; at that point this table is DELETED and the checks
 * below read the part type modules instead. Do not add a second consumer of
 * this table in the meantime — it is a validation input, not app data.
 * ---
 */

import { NUMERIC_FIELDS } from '../partTypes/_fields.js'

// ── Vocabularies ─────────────────────────────────────────────────────────────

/** Part types: what a thing *is*. Primary key of the part model from Phase 1 on. */
export const PART_TYPES = [
  'screw', 'nut', 'washer', 'standoff', 'set-screw', 'insert', 'pin', 'press-nut',
  'o-ring', 'spring', 'spacer', 't-slot-nut',
]

/**
 * Geometries a part can have, stored in the `headType` field.
 *
 * The name is inherited from when every part was a fastener; it means "which
 * shape within its type". A type with one geometry, such as an o-ring, simply
 * uses its own id. Every value here must belong to some part type in
 * src/data/partTypes/. 'pan' and 'flat' are rendered but unused by the current
 * Bossard data.
 */
export const HEAD_TYPES = [
  'button', 'socket', 'low-socket', 'countersunk', 'pan', 'flat',
  'nut', 'washer', 'standoff', 'set-screw', 'insert', 'pin', 'press-nut',
  'o-ring', 'spring', 'spacer', 't-slot-nut',
]

/** Drive types understood by the top-view renderer (partShapes.topScrew). */
export const DRIVES = ['Hex', 'Torx', 'Phillips', 'Slotted']

/** Sub-kinds within a part type. Mirrors the `variants` each type declares. */
export const VARIANTS = [
  'nut-square', 'nut-nylon', 'nut-hex-thin',
  'washer-std', 'washer-large', 'washer-socket',
  'standoff-mf', 'standoff-ff',
  'oring-nbr70', 'oring-fkm', 'oring-epdm',
  'spring-compression', 'spring-extension', 'spring-torsion',
  'spacer-round', 'spacer-hex',
  'tnut-spring-ball', 'tnut-guided', 'tnut-plain',
]

/** Explicit geometry discriminators (replace prose sniffing in Phase 5). */
export const SHAPE_FLAGS = {
  nutShape:     ['hex', 'square'],
  locking:      ['none', 'nylon'],
  standoffEnds: ['mf', 'ff'],
}

/** Threads with an empirical density-table row (densities.js TABLE). */
export const TABULATED_THREADS = ['M2', 'M2.5', 'M3', 'M4', 'M5', 'M6', 'M8', 'M10']

/** Metric machine thread, e.g. "M3", "M2.5". */
const METRIC_THREAD_RE = /^M\d+(\.\d+)?$/
/** Smooth-shank nominal diameter, e.g. "Ø3", "Ø2.5" (dowel pins). */
const DIAMETER_RE = /^Ø\d+(\.\d+)?$/

// ── Per-part-type expectations (transitional — see header) ───────────────────
//
// `requiredFields` names the dimensions an entry of this type must carry. A
// type with no thread simply does not list one, which is what lets a part with
// no fastener geometry at all validate.

export const PART_TYPE_SPECS = {
  screw: {
    headTypes: ['button', 'socket', 'low-socket', 'countersunk', 'pan', 'flat'],
    threadForm: 'metric', requiredFields: ['thread', 'length'], requiresDrive: true,
  },
  nut: {
    headTypes: ['nut'], threadForm: 'metric', requiredFields: ['thread'],
    variants: ['nut-square', 'nut-nylon', 'nut-hex-thin'],
    shapeFlags: ['nutShape', 'locking'],
  },
  washer: {
    headTypes: ['washer'], threadForm: 'metric', requiredFields: ['thread'],
    variants: ['washer-std', 'washer-large', 'washer-socket'],
  },
  standoff: {
    headTypes: ['standoff'], threadForm: 'metric', requiredFields: ['thread', 'length'],
    variants: ['standoff-mf', 'standoff-ff'],
    shapeFlags: ['standoffEnds'],
  },
  'set-screw': { headTypes: ['set-screw'], threadForm: 'metric',   requiredFields: ['thread', 'length'] },
  insert:      { headTypes: ['insert'],    threadForm: 'metric',   requiredFields: ['thread', 'length'] },
  pin:         { headTypes: ['pin'],       threadForm: 'diameter', requiredFields: ['thread', 'length'] },
  'press-nut': { headTypes: ['press-nut'], threadForm: 'metric',   requiredFields: ['thread'] },

  // ── Non-fastener types ──────────────────────────────────────────────────
  // No threadForm, so `thread` is neither required nor checked.
  'o-ring': {
    headTypes: ['o-ring'], requiredFields: ['innerD', 'crossSection'],
    variants: ['oring-nbr70', 'oring-fkm', 'oring-epdm'],
  },
  spring: {
    headTypes: ['spring'], requiredFields: ['outerD', 'freeLength', 'wireD'],
    variants: ['spring-compression', 'spring-extension', 'spring-torsion'],
  },
  spacer: {
    headTypes: ['spacer'], requiredFields: ['outerD', 'innerD', 'length'],
    variants: ['spacer-round', 'spacer-hex'],
  },
  // Threaded, but sized by the profile slot it fits rather than by a length.
  't-slot-nut': {
    headTypes: ['t-slot-nut'], threadForm: 'metric',
    requiredFields: ['thread', 'slotSize'],
    variants: ['tnut-spring-ball', 'tnut-guided', 'tnut-plain'],
  },
}

// ── Validation ───────────────────────────────────────────────────────────────

/**
 * @typedef {object} Issue
 * @property {'error'|'warning'} level
 * @property {string}  sku    the offending entry ('' for catalog-level issues)
 * @property {string}  field  the offending field
 * @property {string}  message
 */

const REQUIRED_STRINGS = ['sku', 'title', 'partType', 'headType']

/**
 * Validate one catalog.
 *
 * Errors are contract violations — the entry would be unreachable, mispriced or
 * mis-drawn. Warnings are degradations the app survives (fallback diameter,
 * geometric density instead of the empirical table).
 *
 * @param {{id: string, parts: object[]}} catalog
 * @returns {{errors: Issue[], warnings: Issue[]}}
 */
export function validateCatalog(catalog) {
  const errors = []
  const warnings = []
  const err  = (sku, field, message) => errors.push({ level: 'error', sku, field, message })
  const warn = (sku, field, message) => warnings.push({ level: 'warning', sku, field, message })

  if (!catalog || typeof catalog !== 'object') {
    err('', 'catalog', 'Catalog is not an object')
    return { errors, warnings }
  }
  if (!Array.isArray(catalog.parts)) {
    err('', 'parts', 'Catalog has no `parts` array')
    return { errors, warnings }
  }

  const seen = new Map()

  for (const [i, entry] of catalog.parts.entries()) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      err(`#${i}`, 'entry', 'Entry is not an object')
      continue
    }

    const sku = typeof entry.sku === 'string' && entry.sku ? entry.sku : `#${i}`

    // — Required fields —
    for (const field of REQUIRED_STRINGS) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) {
        err(sku, field, `Missing required field \`${field}\``)
      }
    }

    // — Unique SKU within this catalog —
    if (typeof entry.sku === 'string' && entry.sku) {
      if (seen.has(entry.sku)) {
        err(sku, 'sku', `Duplicate sku (also at index ${seen.get(entry.sku)})`)
      } else {
        seen.set(entry.sku, i)
      }
    }

    // — Vocabularies —
    const spec = PART_TYPE_SPECS[entry.partType]
    if (entry.partType != null && !spec) {
      err(sku, 'partType', `Unknown partType "${entry.partType}". Known: ${PART_TYPES.join(', ')}`)
    }
    if (entry.headType != null && !HEAD_TYPES.includes(entry.headType)) {
      err(sku, 'headType',
        `Unknown headType "${entry.headType}" — it has no silhouette renderer and no density model. Known: ${HEAD_TYPES.join(', ')}`)
    }
    if (entry.drive && !DRIVES.includes(entry.drive)) {
      err(sku, 'drive', `Unknown drive "${entry.drive}". Known: ${DRIVES.join(', ')}`)
    }
    if (entry.variant != null && !VARIANTS.includes(entry.variant)) {
      err(sku, 'variant', `Unknown variant "${entry.variant}". Known: ${VARIANTS.join(', ')}`)
    }

    // — headType must belong to the declared partType —
    if (spec && entry.headType && !spec.headTypes.includes(entry.headType)) {
      err(sku, 'headType',
        `headType "${entry.headType}" does not belong to partType "${entry.partType}" (expected one of: ${spec.headTypes.join(', ')})`)
    }

    // — Thread / nominal diameter —
    // Only for types that have one. An o-ring has no thread, so none of this
    // applies and `thread` is not required.
    if (spec?.threadForm && typeof entry.thread === 'string' && entry.thread) {
      const isMetric = METRIC_THREAD_RE.test(entry.thread)
      const isDiam   = DIAMETER_RE.test(entry.thread)

      if (!isMetric && !isDiam) {
        err(sku, 'thread',
          `Thread "${entry.thread}" is not metric. This project is metric-only: use "M3" for threads or "\u00D83" for smooth shanks.`)
      } else {
        if (spec.threadForm === 'metric' && !isMetric) {
          err(sku, 'thread', `partType "${entry.partType}" expects a metric thread (e.g. "M3"), got "${entry.thread}"`)
        }
        if (spec.threadForm === 'diameter' && !isDiam) {
          err(sku, 'thread', `partType "${entry.partType}" expects a nominal diameter (e.g. "\u00D83"), got "${entry.thread}"`)
        }
        if (!spec.requiredFields?.includes('length') && isMetric && !TABULATED_THREADS.includes(entry.thread)) {
          warn(sku, 'thread',
            `No empirical density row for "${entry.thread}-${entry.headType}" — order quantities fall back to the geometric estimate`)
        }
      }
    }

    // — Required dimensions —
    // Which fields these are is the part type's business, so a type sized by
    // inner diameter and cross-section validates just as well as one sized by
    // thread and length.
    for (const field of spec?.requiredFields ?? []) {
      const value = entry[field]
      if (field === 'thread') {
        if (typeof value !== 'string' || !value.trim()) {
          err(sku, 'thread', `partType "${entry.partType}" requires a \`thread\``)
        }
        continue
      }
      if (typeof value !== 'number' || !(value > 0)) {
        err(sku, field, `partType "${entry.partType}" requires a positive numeric \`${field}\` (mm)`)
      }
    }

    // Numeric dimensions must be numbers whenever present, required or not.
    for (const field of NUMERIC_FIELDS) {
      if (entry[field] != null && typeof entry[field] !== 'number') {
        err(sku, field, `\`${field}\` must be a number when present`)
      }
    }

    // — Drive —
    if (spec?.requiresDrive && !entry.drive) {
      warn(sku, 'drive', `partType "${entry.partType}" normally has a drive — the top view will render without a drive recess`)
    }

    // — Variant: the silent-unreachability trap —
    // When a type has sub-kinds, the assigner cascade filters on `variant`.
    // An entry without one never appears in the UI at all.
    if (spec?.variants) {
      if (!entry.variant) {
        err(sku, 'variant',
          `partType "${entry.partType}" has sub-kinds, so \`variant\` is required — without it the entry is unreachable in the part assigner. Expected one of: ${spec.variants.join(', ')}`)
      } else if (!spec.variants.includes(entry.variant)) {
        err(sku, 'variant',
          `Variant "${entry.variant}" is not valid for partType "${entry.partType}" (expected one of: ${spec.variants.join(', ')})`)
      }
    }

    // — Shape discriminators —
    if (entry.shape != null) {
      if (typeof entry.shape !== 'object' || Array.isArray(entry.shape)) {
        err(sku, 'shape', '`shape` must be an object')
      } else {
        for (const [flag, value] of Object.entries(entry.shape)) {
          const allowed = SHAPE_FLAGS[flag]
          if (!allowed) {
            err(sku, `shape.${flag}`, `Unknown shape flag "${flag}". Known: ${Object.keys(SHAPE_FLAGS).join(', ')}`)
          } else if (!allowed.includes(value)) {
            err(sku, `shape.${flag}`, `Invalid value "${value}" for shape.${flag}. Allowed: ${allowed.join(', ')}`)
          }
        }
      }
    }
    for (const flag of spec?.shapeFlags ?? []) {
      if (entry.shape?.[flag] == null) {
        warn(sku, `shape.${flag}`,
          `partType "${entry.partType}" draws differently depending on \`shape.${flag}\` — without it the renderer falls back to guessing from the title text`)
      }
    }

    // — Types —
    if (entry.norms != null && !Array.isArray(entry.norms)) {
      err(sku, 'norms', '`norms` must be an array of strings')
    }
    for (const field of ['catalogRef', 'material', 'materialGrade']) {
      if (entry[field] != null && typeof entry[field] !== 'string') {
        err(sku, field, `\`${field}\` must be a string`)
      }
    }
  }

  return { errors, warnings }
}
