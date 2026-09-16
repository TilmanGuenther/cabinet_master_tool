#!/usr/bin/env node
/**
 * Scaffold a new supplier catalog.
 *
 *   node tools/new-catalog.mjs wurth "Würth"
 *
 * Creates src/data/catalogs/<id>/ with a meta.js and an empty parts.json, then
 * prints the two lines to paste into the registry. It deliberately does not
 * edit index.js itself: registering a catalog is a decision worth making by
 * hand, and the file is four lines long.
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

const [id, brand] = process.argv.slice(2)

if (!id || !brand) {
  console.error('Usage: node tools/new-catalog.mjs <id> <Brand>')
  console.error('   e.g. node tools/new-catalog.mjs wurth "Würth"')
  process.exit(1)
}

if (!/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error(`Invalid id "${id}".`)
  console.error('Use lowercase letters, digits and hyphens: it becomes a directory name')
  console.error('and is stored in every config that uses this catalog, so it must not change.')
  process.exit(1)
}

const dir = join(ROOT, 'src', 'data', 'catalogs', id)
if (existsSync(dir)) {
  console.error(`${dir} already exists — nothing written.`)
  process.exit(1)
}

const today = new Date().toISOString().slice(0, 10)

const meta = `/**
 * ${brand} catalog.
 *
 * See doc/CATALOG_SCHEMA.md for what belongs here and what belongs in parts.json.
 */
export default {
  id:          '${id}',
  brand:       '${brand}',
  description: '${brand} catalog',

  // Column header wherever a SKU is shown: order list, poster, label sidebar.
  skuLabel: '${brand} Part No.',
  // Label for catalogRef, if this supplier has its own norm or series numbering.
  refLabel: 'Ref',

  // Barcode format for SKUs, or null if this supplier's numbers are not worth
  // scanning — an in-house stock list often is not.
  barcode: 'CODE128',

  source: {
    retrieved: '${today}',
    note: 'TODO: where this data came from, and how to regenerate it',
  },
  licence: 'TODO: confirm only factual dimensional data is committed.',
}
`

mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'meta.js'), meta)
writeFileSync(join(dir, 'parts.json'), '[]\n')

console.log(`Created src/data/catalogs/${id}/`)
console.log('  meta.js      — fill in the labels and the source note')
console.log('  parts.json   — your entries, per doc/CATALOG_SCHEMA.md')
console.log('')
console.log('Add these to src/data/catalogs/index.js:')
console.log('')
console.log(`  import ${id.replace(/-./g, m => m[1].toUpperCase())}Meta  from './${id}/meta.js'`)
console.log(`  import ${id.replace(/-./g, m => m[1].toUpperCase())}Parts from './${id}/parts.json'`)
console.log('')
console.log('  export const CATALOGS = {')
console.log('    …')
console.log(`    ${/^[a-z][a-z0-9]*$/.test(id) ? id : `'${id}'`}: { ...${id.replace(/-./g, m => m[1].toUpperCase())}Meta, parts: ${id.replace(/-./g, m => m[1].toUpperCase())}Parts },`)
console.log('  }')
console.log('')
console.log('Then: npm run validate')
console.log('The validator finds your catalog by directory, so it checks your data')
console.log('even before you register it.')
