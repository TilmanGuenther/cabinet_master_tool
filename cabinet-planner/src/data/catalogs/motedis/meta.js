/**
 * Motedis catalog.
 *
 * Aluminium-profile hardware — T-slot nuts, brackets, connectors — which is a
 * real gap in the Bossard range: Bossard stocks only basic T-nuts poorly suited
 * to profile work.
 *
 * See doc/CATALOG_SCHEMA.md for what belongs here and what belongs in parts.json.
 */
export default {
  id:          'motedis',
  brand:       'Motedis',
  description: 'Motedis aluminium profile hardware',

  // Motedis article numbers, e.g. S6ISMONM5G. Alphanumeric, which CODE128
  // encodes without trouble.
  skuLabel: 'Motedis Art. No.',
  refLabel: 'Profile',

  barcode: 'CODE128',

  source: {
    retrieved: '2026-09-16',
    note:
      'Article numbers, threads, slot sizes and materials transcribed from '
      + 'motedis.com product pages. Block dimensions are not published there and '
      + 'remain estimates in partTypes/tSlotNut.js — see '
      + 'tools/importers/motedis/README.md.',
  },
  licence: 'Factual dimensional data only. No Motedis images or page content redistributed.',
}
