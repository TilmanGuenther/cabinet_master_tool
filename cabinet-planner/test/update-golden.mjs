#!/usr/bin/env node
/**
 * Rewrite test/golden.snapshot.json from the current code.
 *
 * Run this ONLY when you intend to change user-visible output, and read the
 * resulting diff before committing it -- that diff is the review artefact for
 * the change. A refactor that is supposed to change nothing must leave this
 * file untouched.
 *
 *   npm run test:golden:update
 */
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { computeGolden } from './compute-golden.mjs'
import { buildCascade } from '../src/views/drawerMap/dmCascade.js'
import { variantToFilter, walkCascade, digest, summarize } from './cascade-walk.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

const golden = computeGolden()
writeFileSync(join(HERE, 'golden.snapshot.json'), JSON.stringify(golden, null, 2) + '\n')
console.log(`Wrote ${golden.length} golden records to test/golden.snapshot.json`)

const cascade = walkCascade().map(({ typeId, selection }) => ({
  typeId,
  selection,
  result: summarize(buildCascade({ typeId, selection, toFilter: variantToFilter })),
}))
writeFileSync(join(HERE, 'cascade.snapshot.json'), JSON.stringify(cascade, null, 2) + '\n')
console.log(`Wrote ${cascade.length} cascade states to test/cascade.snapshot.json`)
console.log('Review the diff: it is the record of what this change does to user-visible output.')
