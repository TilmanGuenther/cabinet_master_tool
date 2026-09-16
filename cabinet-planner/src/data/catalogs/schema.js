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
 * `utils/fastenerShapes.js`. Phase 1 introduces `src/data/partTypes/` as one
 * module per part type; at that point this table is DELETED and the checks
 * below read the part type modules instead. Do not add a second consumer of
 * this table in the meantime — it is a validation input, not app data.
 * ---
 */

// ── Vocabularies ─────────────────────────────────────────────────────────────

/** Part types: what a thing *is*. Primary key of the part model from Phase 1 on. */
export const PART_TYPES = [
  'screw', 'nut', 'washer', 'standoff', 'set-screw', 'insert', 'pin', 'press-nut',
]

/**
 * Head types. Every value here must have a silhouette renderer in
 * fastenerShapes.js and a volume case in densities.js.
 * 'pan' and 'flat' are rendered but absent from the current Bossard data.
 */
export const HEAD_TYPES = [
  'button', 'socket', 'low-socket', 'countersunk', 'pan', 'flat',
  'nut', 'washer', 'standoff', 'set-screw', 'insert', 'pin', 'press-nut',
]

/** Drive types understood by the top-view renderer (fastenerShapes.topScrew). */
export const DRIVES = ['Hex', 'Torx', 'Phillips', 'Slotted']

/** Sub-kinds within a part type. Mirrors VARIANT_DEFS in dmConstants.js. */
export const VARIANTS = [
  'nut-square', 'nut-nylon', 'nut-hex-thin',
  'washer-std', 'washer-large', 'washer-socket',
  'standoff-mf', 'standoff-ff',
]

/** Explicit geometry discriminators (replace prose sniffing in Phase 5). */
export const SHAPE_FLAGS = {
  nutShape:     ['hex', 'square'],
  locking:      ['none', 'nylon'],
  standoffEnds: ['mf', 'ff'],
}

/**
 * Threads the silhouette renderer has a real diameter for.
 * Mirrors THREAD_D in utils/fastenerDims.js — anything outside this renders at
 * the 3 mm fallback, which is a warning, not an error.
 */
export const RENDERABLE_THREADS = ['M2', 'M2.5', 'M3', 'M4', 'M5', 'M6', 'M8', 'M10']

/** Threads with an empirical density-table row (densities.js TABLE). */
export const TABULATED_THREADS = ['M2', 'M2.5', 'M3', 'M4', 'M5', 'M6', 'M8', 'M10']

/** Metric machine thread, e.g. "M3", "M2.5". */
const METRIC_THREAD_RE = /^M\d+(\.\d+)?$/
/** Smooth-shank nominal diameter, e.g. "Ø3", "Ø2.5" (dowel pins). */
const DIAMETER_RE = /^Ø\d+(\.\d+)?$/

// ── Per-part-type expectations (transitional — see header) ───────────────────

export const PART_TYPE_SPECS = {
  screw: {
    headTypes: ['button', 'socket', 'low-socket', 'countersunk', 'pan', 'flat'],
    threadForm: 'metric', requiresLength: true, requiresDrive: true,
  },
  nut: {
    headTypes: ['nut'], threadForm: 'metric', requiresLength: false,
    variants: ['nut-square', 'nut-nylon', 'nut-hex-thin'],
    shapeFlags: ['nutShape', 'locking'],
  },
  washer: {
    headTypes: ['washer'], threadForm: 'metric', requiresLength: false,
    variants: ['washer-std', 'washer-large', 'washer-socket'],
  },
  standoff: {
    headTypes: ['standoff'], threadForm: 'metric', requiresLength: true,
    variants: ['standoff-mf', 'standoff-ff'],
    shapeFlags: ['standoffEnds'],
  },
  'set-screw': { headTypes: ['set-screw'], threadForm: 'metric',   requiresLength: true },
  insert:      { headTypes: ['insert'],    threadForm: 'metric',   requiresLength: true },
  pin:         { headTypes: ['pin'],       threadForm: 'diameter', requiresLength: true },
  'press-nut': { headTypes: ['press-nut'], threadForm: 'metric',   requiresLength: false },
}

// ── Validation ───────────────────────────────────────────────────────────────

/**
 * @typedef {object} Issue
 * @property {'error'|'warning'} level
 * @property {string}  sku    the offending entry ('' for catalog-level issues)
 * @property {string}  field  the offending field
 * @property {string}  message
 */

const REQUIRED_STRINGS = ['sku', 'title', 'partType', 'headType', 'thread']

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
    if (typeof entry.thread === 'string' && entry.thread) {
      const isMetric = METRIC_THREAD_RE.test(entry.thread)
      const isDiam   = DIAMETER_RE.test(entry.thread)

      if (!isMetric && !isDiam) {
        err(sku, 'thread',
          `Thread "${entry.thread}" is not metric. This project is metric-only: use "M3" for threads or "Ø3" for smooth shanks.`)
      } else {
        if (spec?.threadForm === 'metric' && !isMetric) {
          err(sku, 'thread', `partType "${entry.partType}" expects a metric thread (e.g. "M3"), got "${entry.thread}"`)
        }
        if (spec?.threadForm === 'diameter' && !isDiam) {
          err(sku, 'thread', `partType "${entry.partType}" expects a nominal diameter (e.g. "Ø3"), got "${entry.thread}"`)
        }
        if (isMetric && !RENDERABLE_THREADS.includes(entry.thread)) {
          warn(sku, 'thread',
            `Thread "${entry.thread}" is not in THREAD_D (utils/fastenerDims.js) — the silhouette will be drawn at the 3 mm fallback diameter`)
        }
        if (isDiam) {
          warn(sku, 'thread',
            `Nominal diameter "${entry.thread}" is not in THREAD_D (utils/fastenerDims.js) — the silhouette will be drawn at the 3 mm fallback diameter`)
        }
        if (spec && !spec.requiresLength && isMetric && !TABULATED_THREADS.includes(entry.thread)) {
          warn(sku, 'thread',
            `No empirical density row for "${entry.thread}-${entry.headType}" — order quantities fall back to the geometric estimate`)
        }
      }
    }

    // — Length —
    if (spec?.requiresLength) {
      if (typeof entry.length !== 'number' || !(entry.length > 0)) {
        err(sku, 'length', `partType "${entry.partType}" requires a positive numeric \`length\` (mm)`)
      }
    } else if (entry.length != null && typeof entry.length !== 'number') {
      err(sku, 'length', '`length` must be a number when present')
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
