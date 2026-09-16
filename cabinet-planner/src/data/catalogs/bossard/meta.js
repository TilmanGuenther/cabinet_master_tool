/**
 * Bossard AG fastener catalog.
 *
 * See doc/CATALOG_SCHEMA.md for what belongs in a meta.js and what belongs in
 * parts.json.
 */
export default {
  id:          'bossard',
  brand:       'Bossard',
  description: 'Bossard AG fastener catalog (BN norms)',

  // Column header wherever a SKU is shown: order list, poster, label sidebar.
  skuLabel: 'Bossard PN',
  // Label for catalogRef, which for Bossard is the BN norm.
  refLabel: 'BN',

  // Article numbers are plain digits, which CODE128 encodes fine.
  barcode: 'CODE128',

  source: {
    retrieved: '2025-03-11',
    note: 'Parsed from public BN datasheets with tools/importers/bossard/parse.py',
  },
  licence: 'Factual dimensional data only. No Bossard PDFs or artwork are redistributed.',
}
