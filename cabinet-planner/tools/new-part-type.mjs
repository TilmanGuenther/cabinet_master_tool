#!/usr/bin/env node
/**
 * Scaffold a new part type.
 *
 *   node tools/new-part-type.mjs bearing Bearing
 *
 * Writes src/data/partTypes/<id>.js with every required member present and a
 * volume model you must replace, then prints what else to touch. As with
 * new-catalog.mjs it does not edit the registry: that is one line, and worth
 * adding deliberately.
 */

import { writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

const [id, label] = process.argv.slice(2)

if (!id || !label) {
  console.error('Usage: node tools/new-part-type.mjs <id> <Label>')
  console.error('   e.g. node tools/new-part-type.mjs bearing Bearing')
  process.exit(1)
}

if (!/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error(`Invalid id "${id}".`)
  console.error('Use lowercase letters, digits and hyphens: it is stored in every config')
  console.error('as part.partType, so once published it must not change.')
  process.exit(1)
}

const camel = id.replace(/-./g, m => m[1].toUpperCase())
const file = join(ROOT, 'src', 'data', 'partTypes', `${camel}.js`)

if (existsSync(file)) {
  console.error(`${file} already exists — nothing written.`)
  process.exit(1)
}

const src = `/**
 * Part type: ${label.toLowerCase()}.
 *
 * TODO: what this is, and what distinguishes one from another.
 */

export default {
  id: '${id}',
  label: '${label}',

  // Geometries this type covers. A type with one shape just uses its own id.
  headTypes: ['${id}'],
  headLabels: { '${id}': '${label}' },

  // The questions the part assigner asks, in order. Use field names from
  // _fields.js -- add one there if this type needs a dimension nothing else has.
  cascade: ['variant', 'outerD'],

  // Sub-kinds that are physically different enough to matter. Delete if there
  // are none, and drop 'variant' from the cascade too.
  variants: [
    { value: '${id}-a', label: 'TODO Variant A' },
    { value: '${id}-b', label: 'TODO Variant B' },
  ],

  /** Text for the assigner and the stored part description. */
  describe(entry, variantLabel) {
    return [sizeText(entry), variantLabel || entry.material].filter(Boolean).join(' ')
  },

  /** Compact one-line text for a bin label. */
  shortLabel(part) {
    return \`\${sizeText(part)} \\u00B7 ${label}\`
  },

  /**
   * Effective packed volume per piece, in mm3, including a random-packing
   * penalty. This drives every order-list quantity, so document the factor you
   * chose and treat it as an estimate until you have checked it against a real
   * bin.
   *
   * TODO: replace this placeholder with the real geometry.
   */
  volumeMM3(part) {
    const od = part.outerD || 1
    return Math.PI * (od / 2) ** 2 * od * 1.8
  },

  // Optional. Omit \`svg\` entirely and labels fall back to text, which is a
  // perfectly good starting point. See partTypes/index.js for the full shape,
  // and compose drawings from the primitives in utils/partShapes.js.
}

function sizeText(part) {
  if (part.outerD == null) return ''
  return \`\\u00D8\${part.outerD}\`
}
`

writeFileSync(file, src)

console.log(`Created src/data/partTypes/${camel}.js`)
console.log('')
console.log('Still to do:')
console.log('')
console.log(`  1. src/data/partTypes/index.js — import it and add to PART_TYPES:`)
console.log(`       import ${camel} from './${camel}.js'`)
console.log(`       ${id === camel ? camel : `${/^[a-z][a-z0-9]*$/.test(id) ? id : `'${id}'`}: ${camel},`}${id === camel ? ',' : ''}`)
console.log('')
console.log('  2. src/data/catalogs/schema.js — add to the vocabularies so catalogs')
console.log('     carrying this type validate:')
console.log(`       PART_TYPES      += '${id}'`)
console.log(`       HEAD_TYPES      += '${id}'`)
console.log(`       VARIANTS        += your variant values`)
console.log(`       PART_TYPE_SPECS += { headTypes: ['${id}'], requiredFields: [...] }`)
console.log('')
console.log('  3. Replace volumeMM3 with the real geometry, and say what packing')
console.log('     factor you used and why.')
console.log('')
console.log('  4. npm test — lint, validate and the golden snapshots must all pass.')
console.log('     Nothing that already existed should move.')
