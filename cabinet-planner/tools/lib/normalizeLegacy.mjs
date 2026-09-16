/**
 * Adapter: legacy `src/data/bossard-db.json` → normalized catalog entry schema.
 *
 * The legacy file predates the catalog schema: it uses Bossard-specific field
 * names (`articleNumber`, `bossardNorm`) and leaves `partType`, `variant` and
 * `shape` implicit — inferred at runtime from head types, BN norm numbers and
 * German title text.
 *
 * This module makes that inference explicit, exactly once. It lets
 * `validate-catalogs.mjs` check the real data before the migration happens, and
 * Phase 3.1 of doc/CATALOG_PLUGIN_PLAN.md reuses it as the migration itself.
 *
 * Delete this file once `src/data/catalogs/bossard/parts.json` exists.
 */

/** headType → partType. Mirrors TYPE_DEFS in views/drawerMap/dmConstants.js. */
const PART_TYPE_BY_HEAD = {
  button: 'screw', socket: 'screw', 'low-socket': 'screw', countersunk: 'screw',
  pan: 'screw', flat: 'screw',
  nut: 'nut', washer: 'washer', standoff: 'standoff',
  'set-screw': 'set-screw', insert: 'insert', pin: 'pin', 'press-nut': 'press-nut',
}

/** bossardNorm → variant. Mirrors VARIANT_DEFS in views/drawerMap/dmConstants.js. */
const VARIANT_BY_NORM = {
  'BN 145': 'nut-square', 'BN 3525': 'nut-square',
  'BN 161': 'nut-nylon',
  'BN 20242': 'nut-hex-thin',
  'BN 715': 'washer-std',
  'BN 729': 'washer-large',
  'BN 726': 'washer-socket',
  'BN 3318': 'standoff-mf',
  'BN 3319': 'standoff-ff',
}

/**
 * Derive the explicit `shape` block from what the renderers currently sniff:
 *   isSquareNut()    — utils/fastenerDims.js
 *   isMFStandoff()   — utils/fastenerDims.js
 *   nyloc detection  — utils/fastenerShapes.js, views/labelSheet/lsHelpers.js
 */
function deriveShape(entry, partType) {
  const title = entry.title || ''
  const shape = {}

  if (partType === 'nut') {
    shape.nutShape = entry.bossardNorm === 'BN 145' || title.includes('Vierkant') ? 'square' : 'hex'
    shape.locking  = entry.bossardNorm === 'BN 161' || /nyloc/i.test(title) ? 'nylon' : 'none'
  }
  if (partType === 'standoff') {
    shape.standoffEnds = title.includes('Aussengewinde') ? 'mf' : 'ff'
  }
  return Object.keys(shape).length ? shape : undefined
}

/** @returns {object} a normalized catalog entry */
export function normalizeLegacyEntry(entry) {
  const partType = PART_TYPE_BY_HEAD[entry.headType] ?? entry.headType
  const variant  = VARIANT_BY_NORM[entry.bossardNorm]
  const shape    = deriveShape(entry, partType)

  const out = {
    sku:        entry.articleNumber,
    catalogRef: entry.bossardNorm || '',
    title:      entry.title || '',
    norms:      entry.norms || [],
    partType,
    headType:   entry.headType || '',
    thread:     entry.thread || '',
    drive:      entry.drive || '',
    material:      entry.material || '',
    materialGrade: entry.materialGrade || '',
  }
  if (variant) out.variant = variant
  if (entry.length != null) out.length = entry.length
  if (shape) out.shape = shape
  return out
}

/** @returns {{id: string, brand: string, parts: object[]}} */
export function normalizeLegacyCatalog(rawParts) {
  return { id: 'bossard', brand: 'Bossard', parts: rawParts.map(normalizeLegacyEntry) }
}
