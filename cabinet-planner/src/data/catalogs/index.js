/**
 * Catalog registry.
 *
 * A catalog answers *who sells a part*: SKUs, the supplier's own norms, how its
 * numbers are labelled and barcoded. What a part *is* -- its dimensions,
 * description, density and drawing -- belongs to its part type in
 * src/data/partTypes/. The two are independent extension points.
 *
 * ---
 * To add a catalog:
 *
 *  1. Create src/data/catalogs/<your-id>/ with:
 *       meta.js     identity and labels (copy bossard/meta.js as a template)
 *       parts.json  entries in the schema documented in doc/CATALOG_SCHEMA.md
 *  2. Import both below and add one line to CATALOGS.
 *  3. Run `npm run validate`. It reports per-SKU errors for anything that would
 *     be unreachable in the assigner, mispriced, or drawn as the wrong part.
 *
 * Imports are static on purpose: the production build inlines everything into a
 * single file and cannot fetch or dynamically import (ADR-003).
 * ---
 */

import bossardMeta  from './bossard/meta.js'
import bossardParts from './bossard/parts.json'

export const CATALOGS = {
  bossard: { ...bossardMeta, parts: bossardParts },
}

/** Used for entries and part records that name no supplier. */
export const DEFAULT_CATALOG = 'bossard'

/** @returns {object} the catalog, falling back to the default for unknown ids. */
export function getCatalog(id) {
  return CATALOGS[id] ?? CATALOGS[DEFAULT_CATALOG]
}

/**
 * Every part from every registered catalog, each tagged with the catalog it
 * came from. `supplier` lives here rather than in parts.json, so a catalog file
 * never has to repeat its own name.
 */
export function allParts() {
  return Object.values(CATALOGS).flatMap(
    catalog => catalog.parts.map(part => ({ ...part, supplier: catalog.id })),
  )
}

/**
 * Find one entry by its supplier-scoped identity.
 *
 * SKUs are only unique within a catalog -- two suppliers can easily both sell a
 * part numbered 1092448 -- so both halves are required.
 */
export function findBySku(supplier, sku) {
  return getCatalog(supplier).parts.find(part => part.sku === sku) ?? null
}
