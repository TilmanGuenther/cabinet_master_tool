/**
 * Supplier-scoped identity for a part stored in a config.
 *
 * A SKU is only unique within its catalog -- two suppliers can easily both sell
 * a part numbered 1092448 -- so identity is the pair, never the number alone.
 *
 * Configs written before Phase 4 carry only `bossardPN`. Those are read as
 * Bossard parts, which is what they were, so old files keep working without a
 * migration. See doc/CONFIG_SCHEMA.md.
 */

import { getCatalog, DEFAULT_CATALOG } from '../data/catalogs/index.js'

/**
 * @param {object} part  part record from a config
 * @returns {{supplier: string, sku: string}|null} null when the part names no SKU
 */
export function partIdentity(part) {
  if (part?.sku)       return { supplier: part.supplier || DEFAULT_CATALOG, sku: part.sku }
  if (part?.bossardPN) return { supplier: 'bossard', sku: part.bossardPN }
  return null
}

/** The part's SKU, or '' when it has none. */
export function partSku(part) {
  return partIdentity(part)?.sku ?? ''
}

/** The catalog a part came from, falling back to the default. */
export function catalogFor(part) {
  return getCatalog(partIdentity(part)?.supplier)
}

/**
 * What to call this supplier's part numbers, e.g. 'Bossard PN'.
 * Used for table headers, CSV columns and the label override field.
 */
export function skuLabel(part) {
  return catalogFor(part).skuLabel || 'Part No.'
}

/**
 * The value to encode as a barcode, or '' when this supplier has no barcode
 * format -- an in-house stock list may have nothing worth scanning.
 */
export function barcodeValue(part) {
  const catalog = catalogFor(part)
  if (!catalog.barcode) return ''
  return partSku(part)
}
